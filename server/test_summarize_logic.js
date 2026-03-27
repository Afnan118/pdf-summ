import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

async function testSummarize() {
  const content = "This is a test document content about AI and PDF summarization. It should be summarized into JSON.";
  const prompt = `You are an expert document summarizer. Summarize the following document content into a specific JSON format.
    
REQUIREMENTS:
1. "short_summary": A 1-2 sentence TL;DR of the whole document.
2. "detailed_summary": A full paragraph explaining the main themes, purposes, and conclusions of the document.
3. "key_points": An array of strings, where each string is a bullet-point key takeaway (max 5 points).

Respond ONLY with valid JSON matching this schema:
{
  "short_summary": "...",
  "detailed_summary": "...",
  "key_points": ["...", "..."]
}

Document Content:
${content}
`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    });

    let responseText = result.response.text() || '{}';
    console.log("Raw Response:", responseText);
    
    // Clean markdown code blocks if present
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const summaryJSON = JSON.parse(responseText);
    console.log("✅ Success:", summaryJSON);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    if (error.response) {
      console.error("Response data:", error.response);
    }
  }
}

testSummarize();
