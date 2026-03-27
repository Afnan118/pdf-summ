import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateEmbedding(text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: 768
  });
  return result.embedding.values;
}



export function chunkText(text, maxTokens = 500) {
  // Keeping the same chunking logic as before for consistency
  const sentences = text.split(/(?<=[.?!])\s+/);
  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk.length + sentence.length) < (maxTokens * 4)) {
      currentChunk += sentence + ' ';
    } else {
      chunks.push(currentChunk.trim());
      currentChunk = sentence + ' ';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Global model instance for chat (using flash-latest for broader regional support)
export const gemini = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

