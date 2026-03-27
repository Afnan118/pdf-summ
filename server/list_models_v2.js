import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    const fetch = (await import('node-fetch')).default;
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    fs.writeFileSync('models_list.json', JSON.stringify(data, null, 2));
    console.log('✅ Models list saved to models_list.json');
  } catch (error) {
    console.error('❌ Failed to list models:', error.message);
  }
}

listModels();
