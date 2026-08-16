import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const CHROMA_BASE_URL = process.env.CHROMA_BASE_URL || 'http://localhost:8000';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'asthma_docs';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || 'qwen2:0.5b';
const GENERATION_MODEL = process.env.OLLAMA_GENERATE_MODEL || 'qwen2:0.5b';
const SOURCE_FOLDER = path.resolve(process.cwd(), 'asthma_document');

async function ollamaRequest(endpoint, payload) {
    const response = await fetch(`${OLLAMA_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const text = await response.text();
    if (!response.ok) {
        throw new Error(`Ollama request failed (${response.status}): ${text}`);
    }

    return text ? JSON.parse(text) : {};
}

async function embedText(textOrTexts) {
    const input = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
    const result = await ollamaRequest('/api/embed', {
        model: EMBEDDING_MODEL,
        input
    });

    if (Array.isArray(result.embeddings)) {
        return Array.isArray(textOrTexts) ? result.embeddings : result.embeddings[0];
    }

    if (Array.isArray(result.embedding)) {
        return result.embedding;
    }

    throw new Error('Unexpected Ollama embedding response format.');
}

async function generateAnswer(prompt) {
    const result = await ollamaRequest('/api/generate', {
        model: GENERATION_MODEL,
        prompt,
        stream: false,
        options: {
            temperature: 0.1,
            top_p: 0.9
        }
    });

    return result.response || '';
}

function splitTextIntoChunks(text, chunkSize = 700, overlap = 120) {
    if (!text) return [];

    const cleanText = text
        .replace(/\s+/g, ' ')
        .trim();

    const chunks = [];
    for (let i = 0; i < cleanText.length; i += chunkSize - overlap) {
        const chunk = cleanText.slice(i, i + chunkSize).trim();
        if (chunk.length > 0) {
            chunks.push(chunk);
        }
    }

    return chunks;
}

async function extractTextFromPdf(pdfPath) {
    const fileBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(fileBuffer);
    return data.text || '';
}

function getPdfFiles(folderPath) {
    if (!fs.existsSync(folderPath)) {
        throw new Error(`Folder not found: ${folderPath}`);
    }

    return fs
        .readdirSync(folderPath)
        .filter((file) => file.toLowerCase().endsWith('.pdf'))
        .sort();
}

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
        throw new Error(`Chroma request failed (${response.status}): ${text}`);
    }

    return text ? JSON.parse(text) : {};
}

async function ensureCollection(collectionName) {
    const collectionsResponse = await chromaRequest('/api/v1/collections');
    const existingCollection = collectionsResponse.collections?.find((item) => item.name === collectionName);

    if (existingCollection) {
        return existingCollection;
    }

    return chromaRequest('/api/v1/collections', {
        method: 'POST',
        body: JSON.stringify({
            name: collectionName,
            metadata: {}
        })
    });
}

async function addChunksToCollection(collectionName, chunks) {
    const collection = await ensureCollection(collectionName);
    const embeddings = await embedText(chunks);

    const ids = chunks.map((_, index) => `chunk-${Date.now()}-${index}`);
    const documents = chunks;
    const metadatas = chunks.map((chunk, index) => ({
        chunk_index: index,
        source: collectionName,
        text_length: chunk.length
    }));

    await chromaRequest(`/api/v1/collections/${encodeURIComponent(collection.id)}/add`, {
        method: 'POST',
        body: JSON.stringify({
            ids,
            embeddings,
            documents,
            metadatas
        })
    });

    return collection;
}

async function queryCollection(collectionName, question, topK = 4) {
    const collection = await ensureCollection(collectionName);
    const queryEmbedding = await embedText(question);

    const result = await chromaRequest(`/api/v1/collections/${encodeURIComponent(collection.id)}/query`, {
        method: 'POST',
        body: JSON.stringify({
            query_embeddings: [queryEmbedding],
            n_results: topK,
            include: ['documents', 'metadatas', 'distances']
        })
    });

    const documents = result?.documents?.[0] || [];
    const metadatas = result?.metadatas?.[0] || [];
    const distances = result?.distances?.[0] || [];

    return documents.map((document, index) => ({
        document,
        metadata: metadatas[index] || {},
        distance: distances[index]
    }));
}

async function buildKnowledgeBase(folderPath = SOURCE_FOLDER, collectionName = COLLECTION_NAME) {
    const pdfFiles = getPdfFiles(folderPath);

    if (pdfFiles.length === 0) {
        throw new Error(`No PDF files found in ${folderPath}`);
    }

    const allChunks = [];

    for (const file of pdfFiles) {
        const pdfPath = path.join(folderPath, file);
        const text = await extractTextFromPdf(pdfPath);
        const chunks = splitTextIntoChunks(text, 700, 120);
        allChunks.push(...chunks.map((chunk) => ({
            file,
            chunk
        })));
    }

    const documents = allChunks.map((item) => `${item.file}\n\n${item.chunk}`);
    await addChunksToCollection(collectionName, documents);
    return documents.length;
}

async function askQuestion(question, collectionName = COLLECTION_NAME, topK = 4) {
    const matches = await queryCollection(collectionName, question, topK);

    if (!matches.length) {
        return {
            answer: 'I could not find relevant information in the asthma documents.',
            context: [],
            question
        };
    }

    const context = matches
        .map((match, index) => `Context ${index + 1}:\n${match.document}`)
        .join('\n\n');

    const prompt = [
        'Use only the context below to answer the question.',
        'If the answer is not present in the context, say that the information is not available in the provided documents.',
        '',
        'Context:',
        context,
        '',
        'Question:',
        question,
        '',
        'Answer:'
    ].join('\n');

    const answer = await generateAnswer(prompt);

    return {
        answer: answer.trim(),
        context: matches,
        question
    };
}

async function runRag() {
    const count = await buildKnowledgeBase();
    console.log(`Indexed ${count} chunks from asthma documents.`);

    const question = 'What are the common symptoms and triggers of asthma?';
    const result = await askQuestion(question);
    console.log('\nQuestion:', question);
    console.log('\nAnswer:\n', result.answer);
}

export {
    extractTextFromPdf,
    splitTextIntoChunks,
    buildKnowledgeBase,
    askQuestion,
    generateAnswer,
    queryCollection,
    embedText
};

if (process.argv[1] && process.argv[1].includes('rag.js')) {
    runRag();
}
