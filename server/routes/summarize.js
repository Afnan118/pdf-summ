import express from 'express';
import { supabase } from '../utils/supabase.js';
import { getChatModel } from '../utils/gemini.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const userId = req.userId;
    const { documentId } = req.body;

    console.log(`[Summarize] 📝 Starting for doc: ${documentId}, user: ${userId}`);

    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', Number(documentId))
      .single();

    if (docError || !doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // If already summarized, return existing summaries
    if (doc.short_summary || doc.detailed_summary) {
      return res.json({
        short_summary: doc.short_summary,
        detailed_summary: doc.detailed_summary,
        key_points: doc.key_points ? JSON.parse(doc.key_points) : []
      });
    }

    // Call OpenAI for Summarization
    const prompt = `You are an expert document summarizer. Summarize the following document content into a specific JSON format.
    
    REQUIREMENTS:
    1. "short_summary": A 1-2 sentence TL;DR of the whole document.
    2. "detailed_summary": A full paragraph explaining the main themes, purposes, and conclusions.
    3. "key_points": An array of strings, where each string is a bullet-point key takeaway (max 5 points).
    
    Respond ONLY with valid JSON matching this schema:
    {
      "short_summary": "...",
      "detailed_summary": "...",
      "key_points": ["...", "..."]
    }

    Document Content:
    ${doc.content.substring(0, 50000)}
    `;

    console.log(`[Summarize] Calling Gemini API...`);
    let model = getChatModel();

    let result;
    let attempt = 0;
    while (attempt < 4) {
      try {
        result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        });
        break; // break if success
      } catch (err) {
        attempt++;
        if (err.message && (err.message.includes('503') || err.message.includes('429'))) {
          if (attempt >= 4) throw err;

          let waitSeconds = attempt * 3;
          // Strategy: Switch model on 2nd and 3rd attempt to bypass specific model overloads
          if (attempt === 2) {
            console.log(`[Summarize] 🔄 Falling back to gemini-flash-latest model due to persistent overload...`);
            model = getChatModel("", "gemini-flash-latest");
          } else if (attempt === 3) {
            console.log(`[Summarize] 🔄 Falling back to gemini-2.5-flash-lite model due to persistent overload...`);
            model = getChatModel("", "gemini-2.5-flash-lite");
          }

          console.log(`[Summarize] Gemini 503/429 Error. Retrying in ${waitSeconds} seconds...`);
          await new Promise(r => setTimeout(r, waitSeconds * 1000));
        } else {
          throw err;
        }
      }
    }

    const summaryJSON = JSON.parse(result.response.text());

    // Persist to database
    await supabase.from('documents').update({
      short_summary: summaryJSON.short_summary,
      detailed_summary: summaryJSON.detailed_summary,
      key_points: JSON.stringify(summaryJSON.key_points),
      metadata: { ...(doc.metadata || {}), last_summarized: new Date().toISOString() }
    }).eq('id', Number(documentId));

    return res.json(summaryJSON);

  } catch (error) {
    console.error('[Summarize] Error:', error);
    let fallbackErrorMsg = "We encountered an error while summarizing this document.";
    if (error.message && error.message.includes('503')) {
      fallbackErrorMsg = "Google's Gemini Free Tier is currently experiencing extreme high demand. The bots are overloaded right now. Please try again in a few minutes.";
    }

    return res.json({
      short_summary: "Summarization failed.",
      detailed_summary: fallbackErrorMsg,
      key_points: ["Error: " + error.message]
    });
  }
});

export default router;
