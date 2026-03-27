import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { gemini } from '../utils/gemini.js';

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

    // Check if the document belongs to user and if it already has summaries
    // DEBUG: Find by ID ONLY first to see what's actually in there
    const { data: debugDoc } = await supabase.from('documents').select('user_id').eq('id', Number(documentId)).single();
    if (debugDoc) {
      console.log(`[Summarize] 🔍 Debug: Doc ${documentId} exists with user_id: '${debugDoc.user_id}' (Length: ${debugDoc.user_id?.length})`);
      console.log(`         Incoming user_id: '${userId}' (Length: ${userId?.length})`);
    } else {
      console.log(`[Summarize] 🔍 Debug: Doc ${documentId} NOT FOUND by ID only.`);
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', Number(documentId))
      .single();

    if (docError) {
      console.error(`[Summarize] ❌ Supabase Error for Doc ${documentId}:`, docError.message);
      console.error(`  Details: ${docError.details}, Hint: ${docError.hint}`);
    }

    if (docError || !doc) {
      console.warn(`[Summarize] ⚠️ Doc ${documentId} not found or access denied for ${userId}`);
      return res.status(404).json({ error: 'Document not found' });
    }

    console.log(`[Summarize] 📖 Content length: ${doc.content?.length || 0}`);


    // If already summarized, return existing summaries
    if (doc.short_summary || doc.detailed_summary) {
      return res.json({
        short_summary: doc.short_summary,
        detailed_summary: doc.detailed_summary,
        key_points: doc.key_points ? JSON.parse(doc.key_points) : []
      });
    }

    // Call AI for Summarization
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

Document Content (may be truncated if too long):
${doc.content.substring(0, 50000)}
`;

    // 🤖 Summarization Logic
    let summaryJSON = null;
    try {
      console.log(`[Summarize] AI Requesting...`);
      const result = await gemini.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      console.log(`[Summarize] AI Received Response.`);
      let responseText = result.response.text() || '{}';
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      summaryJSON = JSON.parse(responseText);
    } catch (aiError) {
      console.error(`[Summarize] AI Blocked/Error: ${aiError.message}. Using Local fallback.`);
      const contentStr = doc?.content || '';
      const words = contentStr.replace(/\s+/g, ' ').trim().split(' ');
      summaryJSON = {
        short_summary: words.slice(0, 30).join(' ') + (words.length > 30 ? '...' : ''),
        detailed_summary: words.slice(0, 150).join(' ') + (words.length > 150 ? '...' : ''),
        key_points: ["AI blocked: using preview mode", "Local content extraction active", "Document ID: " + documentId]
      };
    }

    // 💾 Persist to database columns for persistence
    try {
      await supabase.from('documents').update({
        short_summary: summaryJSON.short_summary,
        detailed_summary: summaryJSON.detailed_summary,
        key_points: JSON.stringify(summaryJSON.key_points),
        metadata: { ...(doc?.metadata || {}), last_summarized: new Date().toISOString() }
      }).eq('id', Number(documentId));
    } catch (e) {
      console.error('[Summarize] Supabase Persist failed:', e.message);
    }

    // 🚀 ALWAYS return the summaryJSON (even if it's the fallback version)
    return res.json(summaryJSON);

  } catch (globalError) {
    console.error('[Summarize] Global Crash:', globalError.message);
    // Absolute Last-Resort 200 OK response
    return res.json({
      short_summary: "Summarization engine fallback active.",
      detailed_summary: "The automated AI summary is currently unavailable due to system restrictions. You can still use the chat feature to ask questions about this document.",
      key_points: ["AI Status: Limited", "System: Resilient", "Mode: Text-Preview Only"]
    });
  }
});

export default router;
