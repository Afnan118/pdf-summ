import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbedding768() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const result = await model.embedContent({
      content: { parts: [{ text: "Hello world" }] },
      outputDimensionality: 768
    });
    console.log(`✅ Success: Embedding length is ${result.embedding.values.length}`);
  } catch (error) {
    console.error(`❌ Failed:`, error.message);
  }
}

testEmbedding768();
