import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
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

export async function generateBatchEmbeddings(texts) {
  if (!texts || texts.length === 0) return [];
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

  // Use batch embedding to dodge the Free Tier 15 RPM limit
  // CRITICAL FIX: Force 768 dimensions to match the Supabase pgvector schema
  const requests = texts.map(text => ({
    content: { parts: [{ text }] },
    outputDimensionality: 768
  }));
  const result = await model.batchEmbedContents({ requests });
  return result.embeddings.map(e => e.values);
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

// Function to get a chat model with optional system instruction
export function getChatModel(systemInstruction = "", modelName = "gemini-2.5-flash") {
  const config = { model: modelName };
  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }
  return genAI.getGenerativeModel(config);
}

// Keep the global instance for simple cases
export const gemini = getChatModel();

