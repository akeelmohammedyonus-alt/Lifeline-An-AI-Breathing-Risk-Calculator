import 'dotenv/config';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || 'qwen2:0.5b';

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

// Embed one string or many strings using Ollama's embedding API.
// Some Ollama builds accept /api/embed; others use /api/embeddings.
async function embedText(textOrTexts) {
  const input = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];
  const endpoints = ['/api/embed', '/api/embeddings'];
  let lastError = null;

  for (const endpoint of endpoints) {
    try {
      const result = await ollamaRequest(endpoint, {
        model: EMBEDDING_MODEL,
        input
      });

      const embeddings = result.embeddings;

      if (Array.isArray(embeddings) && embeddings.length > 0) {
        return Array.isArray(textOrTexts) ? embeddings : embeddings[0];
      }

      if (Array.isArray(result.embedding)) {
        return Array.isArray(textOrTexts) ? result.embedding : result.embedding[0];
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Ollama embedding response did not include embeddings.');
}

export { embedText, EMBEDDING_MODEL };
