import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbeddingDimension() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: "Hello world",
      outputDimensionality: 1536
    });
    console.log(`✅ Success: Embedding length is ${result.embedding.values.length}`);
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
  }
}

testEmbeddingDimension();
