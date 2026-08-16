import { embedText } from './embed.js';
import { CHROMA_BASE_URL, COLLECTION_NAME, chromaRequest, getOrCreateCollection } from './db.js';

// Query ChromaDB and return the most relevant chunks for the question.
async function retrieveRelevantChunks(question, collectionName = COLLECTION_NAME, topK = 3) {
  const cleanedQuestion = String(question || '').trim();

  if (!cleanedQuestion) {
    throw new Error('A question is required for retrieval.');
  }

  const collection = await getOrCreateCollection(collectionName);
  const questionEmbedding = await embedText(cleanedQuestion);

  const result = await chromaRequest(`/api/v1/collections/${encodeURIComponent(collection.id)}/query`, {
    method: 'POST',
    body: JSON.stringify({
      query_embeddings: [questionEmbedding],
      n_results: topK,
      include: ['documents', 'metadatas', 'distances']
    })
  });

  const documents = result.documents?.[0] || [];
  const metadatas = result.metadatas?.[0] || [];
  const distances = result.distances?.[0] || [];

  return documents.map((document, index) => ({
    text: document,
    metadata: metadatas[index] || {},
    distance: distances[index] ?? null
  }));
}

export { retrieveRelevantChunks };
