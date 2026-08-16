// Split text into small chunks that are easier for embeddings and vector search.
// The target size is 300-500 characters per chunk.

function splitIntoChunks(text, targetSize = 400, overlap = 60) {
  if (!text || !text.trim()) return [];

  const cleanText = text.replace(/\s+/g, ' ').trim();
  const chunks = [];

  for (let i = 0; i < cleanText.length; i += targetSize - overlap) {
    const chunk = cleanText.slice(i, i + targetSize).trim();

    if (!chunk) continue;

    // Keep only meaningful chunks.
    if (chunk.length >= 120) {
      chunks.push(chunk);
    }
  }

  // If the final chunk is too short, merge it into the previous chunk.
  for (let i = 1; i < chunks.length; i += 1) {
    const current = chunks[i];
    const previous = chunks[i - 1];

    if (current.length < 200 && previous && previous.length + current.length < 650) {
      chunks[i - 1] = `${previous} ${current}`;
      chunks.splice(i, 1);
      i -= 1;
    }
  }

  return chunks;
}

export { splitIntoChunks };
