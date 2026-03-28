import express from 'express';
import { createClient } from '@supabase/supabase-js';
import openai, { aiModel } from '../utils/ai.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    console.log(`[Summarize] Calling OpenAI (${aiModel})...`);
    const completion = await openai.chat.completions.create({
      model: aiModel,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const summaryJSON = JSON.parse(completion.choices[0].message.content);

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
    return res.json({
      short_summary: "Summarization failed.",
      detailed_summary: "We encountered an error while summarizing this document. Please check your OpenAI API key and balance.",
      key_points: ["Error: " + error.message]
    });
  }
});

export default router;
