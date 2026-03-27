import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testEmbedding(modelName) {
  try {
    console.log(`Testing embedding model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.embedContent("Hello world");
    console.log(`✅ Success for ${modelName}: Embedding length is ${result.embedding.values.length}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed for ${modelName}:`, error.message);
    return false;
  }
}

async function run() {
  const models = ["text-embedding-004", "embedding-001", "embedding-gecko-001"];
  for (const m of models) {
    await testEmbedding(m);
  }
}

run();
