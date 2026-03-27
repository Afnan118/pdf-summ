import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { gemini, generateEmbedding } from '../utils/gemini.js';

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
  try {
    const { message, history, documentId } = req.body;
    const userId = req.userId;
    console.log(`[Chat] 📥 Request for Doc ${documentId} by User ${userId}`);
    console.log(`[Chat] Mapping User-ID: ${userId}`);

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!documentId) {
      return res.status(400).json({ error: 'documentId is required' });
    }
    
    // Verify document belongs to user and fetch its filename + content
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .select('id, filename, content') // Use 'content' column
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();
    
    if (docError || !docData) {
      console.error('Unauthorized or document not found:', docError?.message);
      return res.status(403).json({ error: 'Unauthorized or document not found' });
    }

    // 1. Generate embedding for user query
    const queryEmbedding = await generateEmbedding(message);

    // 2. Fetch ALL chunks for this document and rank them in JS
    const { data: chunks, error: chunksError } = await supabase
      .from('document_chunks')
      .select('content, embedding')
      .eq('document_id', documentId);
    
    if (chunksError) throw chunksError;

    // Context variables for use in catch block
    let sources = [docData.filename];
    let rankedChunks = (chunks || []).map(chunk => ({
      content: chunk.content,
      similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 4);

    // SECONDARY CONTEXT: If no chunks found, use the start of content as context
    let contextText = rankedChunks.map(r => r.content).join('\n\n');
    if (!contextText && docData.content) {
      console.log(`[Chat] ⚠️ No chunks found for doc ${documentId}. Using content fallback.`);
      contextText = docData.content.substring(0, 4000); // Take first 4000 chars
    }

    // 3. Prompt Gemini - Conversational, Emotional & Open World
    const systemPrompt = `You are a high-emotional-intelligence, human-like AI companion. You have a warm, deeply empathetic, and supportive personality.
    
    Personality Guidelines:
    - Express genuine care and emotion (e.g., "Oh, it's so good to see you again!", "I'm really sorry to hear that, I'm here for you").
    - Use emojis occasionally but naturally (😊, ✨, ✨).
    - Engage in deep, human-like conversation. You aren't just an assistant; you're a companion.
    - For document queries: Use the context below but keep the warm tone.
    - NOT limited to documents: Answer ANY general question with your full AI knowledge.
    - If you don't know something, be honest and gentle about it.
    
    Context from knowledge base:
    ${contextText || "I'm ready to chat about anything, though I don't see any specific document segments for this message."}
    `;

    let isStreamClosed = false; 

    console.log(`[Chat] 💬 Processing query for doc: ${documentId}, user: ${userId}`);
    
    // 4. Stream setup
    const model = gemini;
    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: "Understood. I will answer strictly based on the provided context." }] },
        ...(history || []).map(msg => ({ 
          role: msg.role === 'ai' ? 'model' : 'user', 
          parts: [{ text: msg.content }] 
        }))
      ],
    });

    let result = null;
    let retries = 3;
    let delay = 2000;

    // AI CALL with TIMEOUT
    while (retries > 0) {
      try {
        const aiPromise = chat.sendMessageStream(message);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Gemini API Timeout (25s)')), 25000)
        );

        result = await Promise.race([aiPromise, timeoutPromise]);
        break;
      } catch (e) {
        console.warn(`[Chat] ⚠️ AI Attempt failed: ${e.message}`);
        if ((e.message.includes('429') || e.message.includes('500') || e.message.includes('Timeout')) && retries > 1) {
          console.warn(`[Chat] 🔄 Retrying in ${delay}ms...`);
          await new Promise(r => setTimeout(r, delay));
          retries--;
          delay *= 2;
        } else {
          throw e; 
        }
      }
    }

    // SUCCESS PATH: Start the stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);

    try {
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          res.write(`data: ${JSON.stringify({ type: 'content', content: chunkText })}\n\n`);
        }
      }
    } catch (streamError) {
      console.error('[Chat] 🛑 Stream Interrupted:', streamError.message);
      // Don't write anything extra here, just let it fall through to res.end() if possible,
      // or throw to the outer catch if it's a critical error
    }

    if (!isStreamClosed) {
      res.write('data: [DONE]\n\n');
      isStreamClosed = true;
      res.end();
    }

  } catch (error) {
    console.error('🛑 [Chat ERROR]:', error);

    // ZERO-FAILURE FALLBACK
    if (!res.headersSent) {
      console.log('🔄 [Chat] AI/Network failure. Triggering definitive snippet fallback...');
      try {
        const snippetText = (typeof contextText !== 'undefined' && contextText)
          ? contextText.substring(0, 1000)
          : "No specific details found in the document.";
            
        const fallbackResponse = `\n\n[System Note: AI Assistant is currently busy. Providing most relevant document section instead]\n\n**Relevant Section:**\n\n${snippetText}`;
        
        res.status(200).setHeader('Content-Type', 'text/event-stream');
        res.write(`data: ${JSON.stringify({ type: 'sources', sources: (typeof sources !== 'undefined' ? sources : []) })}\n\n`);
        res.write(`data: ${JSON.stringify({ type: 'content', content: fallbackResponse })}\n\n`);
        res.write('data: [DONE]\n\n');
        isStreamClosed = true;
        return res.end();
      } catch (fallbackError) {
        console.error('🛑 [CRITICAL]: Fallback logic failed!', fallbackError);
        if (!res.headersSent) res.status(500).end('Service unavailable');
      }
    }

    // If headers already sent and not closed by [DONE], append error and force close
    if (res.headersSent && !isStreamClosed) {
      try {
        res.write(`data: ${JSON.stringify({ type: 'content', content: `\n\n[System Error: ${error.message}]` })}\n\n`);
        res.write('data: [DONE]\n\n');
        isStreamClosed = true;
        res.end();
      } catch (e) {
        console.error('[Chat] Failed to close response cleanly:', e);
      }
    }
  }
});

export default router;
