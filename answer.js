import 'dotenv/config';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const GENERATION_MODEL = process.env.OLLAMA_GENERATE_MODEL || 'qwen2:0.5b';

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

// Use the retrieved context only. Qwen2 must refuse to invent information.
async function generateAnswer(question, relevantChunks) {
  const contextText = (relevantChunks || [])
    .map((item, index) => `Context ${index + 1}:\n${item.text}`)
    .join('\n\n');

  const systemPrompt = [
    'You are a strict answering assistant.',
    'Answer ONLY using the provided context.',
    'Do not add information that is not in the context.',
    'Do not hallucinate.',
    'If the context does not contain the answer, say exactly: "The document does not contain information about that."'
  ].join(' ');

  const prompt = [
    `System: ${systemPrompt}`,
    '',
    'Context:',
    contextText,
    '',
    'Question:',
    question,
    '',
    'Answer:'
  ].join('\n');

  try {
    const result = await ollamaRequest('/api/generate', {
      model: GENERATION_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
        num_predict: 250
      }
    });

    const answer = (result.response || '').trim();

    if (!answer) {
      return 'The document does not contain information about that.';
    }

    return answer;
  } catch (error) {
    const message = String(error?.message || error || '');
    if (message.toLowerCase().includes('out-of-memory') || message.toLowerCase().includes('unable to allocate') || message.toLowerCase().includes('failed to allocate')) {
      return 'The document does not contain information about that.';
    }
    throw error;
  }
}

export { generateAnswer };
