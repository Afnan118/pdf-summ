import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbeddingV2() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-2-preview" });
    const result = await model.embedContent("Hello world");
    console.log(`✅ Success: Embedding length for gemini-embedding-2-preview is ${result.embedding.values.length}`);
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
  }
}

testEmbeddingV2();
