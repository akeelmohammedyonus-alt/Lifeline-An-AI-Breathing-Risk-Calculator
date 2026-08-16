import path from 'path';
import { getPdfPaths, extractTextFromPdf } from './pdfLoader.js';
import { splitIntoChunks } from './chunker.js';
import { addDocumentsToCollection, COLLECTION_NAME } from './db.js';
import { retrieveRelevantChunks } from './retrieve.js';
import { generateAnswer } from './answer.js';

const DEFAULT_PDF_FOLDER = path.resolve(process.cwd(), 'documents');

// Build the vector store from all PDFs in the folder.
async function indexPdfFolder(folderPath = DEFAULT_PDF_FOLDER, collectionName = COLLECTION_NAME) {
  const pdfPaths = getPdfPaths(folderPath);

  if (!pdfPaths.length) {
    throw new Error(`No PDF files were found in: ${folderPath}`);
  }

  const allChunks = [];

  for (const pdfPath of pdfPaths) {
    const text = await extractTextFromPdf(pdfPath);
    const chunks = splitIntoChunks(text, 400, 60);

    for (const chunk of chunks) {
      allChunks.push({
        text: chunk,
        source: path.basename(pdfPath)
      });
    }
  }

  if (!allChunks.length) {
    throw new Error('No text was extracted from the PDF files.');
  }

  await addDocumentsToCollection(
    collectionName,
    allChunks.map((item) => item.text),
    allChunks.map((item) => ({
      source: item.source,
      chunk_length: item.text.length
    }))
  );

  return allChunks.length;
}

// Final pipeline: index documents, retrieve the most relevant chunks, answer the question.
async function askRAG(question, folderPath = DEFAULT_PDF_FOLDER, collectionName = COLLECTION_NAME, topK = 3) {
  const cleanedQuestion = String(question || '').trim();

  if (!cleanedQuestion) {
    throw new Error('A question is required.');
  }

  await indexPdfFolder(folderPath, collectionName);

  const relevantChunks = await retrieveRelevantChunks(cleanedQuestion, collectionName, topK);

  if (!relevantChunks.length) {
    return {
      answer: 'The document does not contain information about that.',
      context: [],
      question: cleanedQuestion
    };
  }

  const answer = await generateAnswer(cleanedQuestion, relevantChunks);

  return {
    answer,
    context: relevantChunks,
    question: cleanedQuestion
  };
}

export { indexPdfFolder, askRAG };

if (process.argv[1] && process.argv[1].includes('rag.js')) {
  const sampleQuestion = 'What are the common symptoms of asthma?';
  const result = await askRAG(sampleQuestion);
  console.log('Question:', sampleQuestion);
  console.log('Answer:', result.answer);
}

