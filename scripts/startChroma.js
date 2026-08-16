import { ChromaClient, EmbeddingFunction } from 'chromadb';
import http from 'http';

const CHROMA_PORT = process.env.CHROMA_PORT || 8000;
let client;
let collections = new Map();

// Simple embedding function placeholder
class SimpleEmbeddingFunction extends EmbeddingFunction {
    async call(texts) {
        return texts.map((text) =>
            Array(768).fill(0).map(() => Math.random())
        );
    }
}

async function startChromaServer() {
    console.log(`Starting ChromaDB server on port ${CHROMA_PORT}...`);

    // Initialize ChromaDB client with ephemeral (in-memory) mode
    try {
        client = new ChromaClient();
        console.log('ChromaDB client initialized');
    } catch (err) {
        console.error('Failed to initialize ChromaDB client:', err.message);
        console.log('Using ephemeral mode fallback...');
        client = new ChromaClient({ settings: { allow_reset: true } });
    }

    // Create a simple HTTP proxy to ChromaDB client
    const server = http.createServer(async (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            // GET /api/v1/collections - list collections
            if (req.url === '/api/v1/collections' && req.method === 'GET') {
                const collectionList = Array.from(collections.values()).map((c) => ({
                    id: c.id,
                    name: c.name,
                    metadata: c.metadata
                }));
                res.writeHead(200);
                res.end(JSON.stringify({ collections: collectionList }));
                return;
            }

            // POST /api/v1/collections - create collection
            if (req.url === '/api/v1/collections' && req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    try {
                        const { name, metadata } = JSON.parse(body);
                        const id = `collection-${Date.now()}-${Math.random()}`;

                        if (!collections.has(name)) {
                            collections.set(name, {
                                id,
                                name,
                                metadata: metadata || {},
                                documents: [],
                                embeddings: [],
                                metadatas: [],
                                ids: []
                            });
                        }

                        res.writeHead(200);
                        res.end(JSON.stringify({
                            id,
                            name,
                            metadata: metadata || {}
                        }));
                    } catch (error) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
                return;
            }

            // POST /api/v1/collections/{id}/add - add documents
            const addMatch = req.url.match(/^\/api\/v1\/collections\/([^/]+)\/add$/);
            if (addMatch && req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    try {
                        const collectionName = decodeURIComponent(addMatch[1]);
                        const { ids, embeddings, documents, metadatas } = JSON.parse(body);

                        if (!collections.has(collectionName)) {
                            collections.set(collectionName, {
                                id: collectionName,
                                name: collectionName,
                                metadata: {},
                                documents: [],
                                embeddings: [],
                                metadatas: [],
                                ids: []
                            });
                        }

                        const collection = collections.get(collectionName);
                        collection.ids.push(...ids);
                        collection.embeddings.push(...embeddings);
                        collection.documents.push(...documents);
                        collection.metadatas.push(...metadatas);

                        res.writeHead(200);
                        res.end(JSON.stringify({ status: 'ok', count: ids.length }));
                    } catch (error) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
                return;
            }

            // POST /api/v1/collections/{id}/query - query collection
            const queryMatch = req.url.match(/^\/api\/v1\/collections\/([^/]+)\/query$/);
            if (queryMatch && req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk.toString();
                });
                req.on('end', async () => {
                    try {
                        const collectionName = decodeURIComponent(queryMatch[1]);
                        const { query_embeddings, n_results, include } = JSON.parse(body);

                        if (!collections.has(collectionName)) {
                            res.writeHead(404);
                            res.end(JSON.stringify({ error: 'Collection not found' }));
                            return;
                        }

                        const collection = collections.get(collectionName);
                        const queryEmbedding = query_embeddings[0];

                        // Simple cosine similarity search
                        const results = collection.ids.map((id, idx) => {
                            const embedding = collection.embeddings[idx];
                            const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * embedding[i], 0);
                            const normQuery = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
                            const normEmbedding = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
                            const similarity = dotProduct / (normQuery * normEmbedding || 1);

                            return {
                                id,
                                similarity,
                                distance: 1 - similarity,
                                document: collection.documents[idx],
                                metadata: collection.metadatas[idx]
                            };
                        }).sort((a, b) => b.similarity - a.similarity).slice(0, n_results);

                        res.writeHead(200);
                        res.end(JSON.stringify({
                            ids: [results.map((r) => r.id)],
                            embeddings: include.includes('embeddings') ? [results.map((r) => collection.embeddings[collection.ids.indexOf(r.id)])] : null,
                            documents: [results.map((r) => r.document)],
                            metadatas: [results.map((r) => r.metadata)],
                            distances: [results.map((r) => r.distance)]
                        }));
                    } catch (error) {
                        res.writeHead(400);
                        res.end(JSON.stringify({ error: error.message }));
                    }
                });
                return;
            }

            // Not found
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
        } catch (error) {
            console.error('Unexpected error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: error.message }));
        }
    });

    server.listen(CHROMA_PORT, () => {
        console.log(`✓ ChromaDB HTTP API server running on http://localhost:${CHROMA_PORT}`);
        console.log('Press Ctrl+C to stop');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`✗ Port ${CHROMA_PORT} is already in use.`);
        } else {
            console.error('Server error:', err);
        }
        process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n✓ Shutting down ChromaDB server...');
        server.close(() => {
            console.log('✓ ChromaDB server stopped');
            process.exit(0);
        });
    });
}

startChromaServer().catch((err) => {
    console.error('Failed to start ChromaDB server:', err);
    process.exit(1);
});


