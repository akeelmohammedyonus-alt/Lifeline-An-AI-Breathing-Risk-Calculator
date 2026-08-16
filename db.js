import 'dotenv/config';
import { embedText } from './embed.js';

const CHROMA_BASE_URL = process.env.CHROMA_BASE_URL || 'http://localhost:8000';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'rag_docs';

async function chromaRequest(endpoint, options = {}) {
  const response = await fetch(`${CHROMA_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`ChromaDB request failed (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

// Create the collection if it does not already exist.
async function getOrCreateCollection(name = COLLECTION_NAME) {
  const collectionsResponse = await chromaRequest('/api/v1/collections');
  const existing = collectionsResponse.collections?.find((item) => item.name === name);

  if (existing) {
    return existing;
  }

  return chromaRequest('/api/v1/collections', {
    method: 'POST',
    body: JSON.stringify({
      name,
      metadata: { source: 'rag-pipeline' }
    })
  });
}

// Add chunks to ChromaDB with their embeddings and metadata.
async function addDocumentsToCollection(collectionName, documents, metadatas = []) {
  const collection = await getOrCreateCollection(collectionName);

  if (!documents.length) {
    return collection;
  }

  const embeddings = await embedText(documents);
  const ids = documents.map((_, index) => `chunk-${Date.now()}-${index}`);

  const finalMetadatas = documents.map((document, index) => ({
    ...(metadatas[index] || {}),
    source: metadatas[index]?.source || collectionName,
    text_length: document.length
  }));

  await chromaRequest(`/api/v1/collections/${encodeURIComponent(collection.id)}/add`, {
    method: 'POST',
    body: JSON.stringify({
      ids,
      embeddings,
      documents,
      metadatas: finalMetadatas
    })
  });

  return collection;
}

export { CHROMA_BASE_URL, COLLECTION_NAME, getOrCreateCollection, addDocumentsToCollection, chromaRequest };
