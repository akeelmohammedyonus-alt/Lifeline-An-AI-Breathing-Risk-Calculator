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

// Embed one string or many strings using Ollama's /api/embed.
async function embedText(textOrTexts) {
  const input = Array.isArray(textOrTexts) ? textOrTexts : [textOrTexts];

  const result = await ollamaRequest('/api/embed', {
    model: EMBEDDING_MODEL,
    input
  });

  const embeddings = result.embeddings;

  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    throw new Error('Ollama embedding response did not include embeddings.');
  }

  if (Array.isArray(textOrTexts)) {
    return embeddings;
  }

  return embeddings[0];
}

export { embedText, EMBEDDING_MODEL };
