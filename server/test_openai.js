import OpenAI from "openai";
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log("Testing OpenAI Key...");
    console.log(`Key starts with: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 15) : 'MISSING'}`);
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "test",
    });
    console.log("✅ Success! OpenAI Key is valid and has quota.");
  } catch (error) {
    console.error("❌ Failed:", error.status, error.message);
  }
}

testOpenAI();
