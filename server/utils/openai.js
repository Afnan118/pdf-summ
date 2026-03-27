import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

export function chunkText(text, maxTokens = 500) {
  // Simple heuristic text chunking
  // A robust implementation would use a proper token splitter (e.g. tiktoken)
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
