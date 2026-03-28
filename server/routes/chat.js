import express from 'express';
import { createClient } from '@supabase/supabase-js';
import openai, { generateEmbedding, aiModel } from '../utils/ai.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper for cosine similarity
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

router.post('/', async (req, res) => {
  let isStreamClosed = false;
  let sources = [];
  let contextText = "";

  try {
    const { message, history, documentId } = req.body;
    const userId = req.userId;
    console.log(`[Chat] 📥 Request for Doc ${documentId} by User ${userId}`);

    if (!message || !documentId) {
      return res.status(400).json({ error: 'Message and documentId are required' });
    }
    
    // Verify document belongs to user
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id, filename, content')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    
    if (docError || !docData) {
      return res.status(403).json({ error: 'Unauthorized or document not found' });
    }

    sources = [docData.filename];

    // 1. Generate embedding for user query
    const queryEmbedding = await generateEmbedding(message);

    // 2. Fetch ALL chunks for this document and rank them in JS
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, embedding')
      .eq('document_id', documentId);
    
    if (!chunksError && chunks) {
      let rankedChunks = chunks.map(chunk => ({
        content: chunk.content,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 4);

      contextText = rankedChunks.map(r => r.content).join('\n\n');
    }

    // Fallback to start of document if no chunks or poor matching
    if (!contextText && docData.content) {
      contextText = docData.content.substring(0, 4000);
    }

    // 3. Prompt OpenAI
    const systemPrompt = `You are a high-emotional-intelligence, human-like AI companion. You have a warm, deeply empathetic, and supportive personality.
    
    Personality Guidelines:
    - Express genuine care and emotion.
    - Use emojis occasionally but naturally (😊, ✨).
    - Engage in deep, human-like conversation.
    - If document context is provided, use it to inform your answer while maintaining your warm tone.
    - Answer ANY general question with your full knowledge, not just document-specific ones.
    
    Context from knowledge base:
    ${contextText || "I'm ready to chat about anything!"}
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map(msg => ({ 
        role: msg.role === 'ai' ? 'assistant' : 'user', 
        content: msg.content 
      })),
      { role: 'user', content: message }
    ];

    console.log(`[Chat] 💬 Calling OpenAI (${aiModel})...`);
    
    const stream = await openai.chat.completions.create({
      model: aiModel,
      messages: messages,
      stream: true,
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    isStreamClosed = true;
    res.end();

  } catch (error) {
    console.error('🛑 [Chat ERROR]:', error);

    if (!res.headersSent) {
      res.status(200).setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
      const fallbackMsg = `\n\n[System Note: AI Assistant is currently experiencing high load. Providing direct context fallback.]\n\n**Relevant Section:**\n\n${contextText ? contextText.substring(0, 1000) : "No specific details found."}`;
      res.write(`data: ${JSON.stringify({ type: 'content', content: fallbackMsg })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else if (!isStreamClosed) {
      res.write(`data: ${JSON.stringify({ type: 'content', content: `\n\n[System Error: ${error.message}]` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

export default router;
