import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

// Clean the raw PDF text so it is easier to chunk and search.
function cleanText(rawText) {
  if (!rawText) return '';

  return rawText
    .replace(/\r/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

// Read one PDF and return cleaned text.
async function extractTextFromPdf(pdfPath) {
  const fileBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(fileBuffer);
  return cleanText(data.text || '');
}

// Return all PDF files in a folder in a predictable order.
function getPdfPaths(folderPath) {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`PDF folder not found: ${folderPath}`);
  }

  return fs
    .readdirSync(folderPath)
    .filter((file) => file.toLowerCase().endsWith('.pdf'))
    .sort()
    .map((file) => path.join(folderPath, file));
}

export { cleanText, extractTextFromPdf, getPdfPaths };
