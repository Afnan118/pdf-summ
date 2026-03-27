import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbedding001() {
  try {
    const model = genAI.getGenerativeModel({ model: "embedding-001" });
    const result = await model.embedContent("Hello world");
    console.log(`✅ Success: Embedding length for embedding-001 is ${result.embedding.values.length}`);
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
  }
}

testEmbedding001();
