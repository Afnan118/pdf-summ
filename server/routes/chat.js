import express from 'express';
import { supabase } from '../utils/supabase.js';
import { generateEmbedding, chunkText, getChatModel } from '../utils/gemini.js';

const router = express.Router();

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

    // Send initial headers immediately to prevent the frontend from waiting too long for the connection to establish
    res.setHeader('Content-Type', 'text/event-stream');

    // Helper function with built-in retry for rate limits
    const executeWithRetry = async (name, operation, maxRetries = 6) => {
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          // Minimal logging to console to speed up synchronous IO
          const startTime = Date.now();
          const result = await operation();
          return result;
        } catch (err) {
          if (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('Quota'))) {
            attempt++;
            if (attempt >= maxRetries) throw err;
            const waitTime = attempt * 5000; // Reduced backoff penalty
            await new Promise(r => setTimeout(r, waitTime));
          } else {
            throw err;
          }
        }
      }
    };

    // 1. Parallelize Document Fetch and Embedding Generation
    const docFetchPromise = documentId
      ? supabase.from('documents').select('id, filename, content').eq('id', documentId).single().then(r => r.data).catch(() => null)
      : Promise.resolve(null);

    const embeddingPromise = executeWithRetry('Embedding Gen', () => generateEmbedding(message)).catch(e => null);

    const [docData, queryEmbedding] = await Promise.all([docFetchPromise, embeddingPromise]);

    if (docData) {
      sources = [docData.filename];
      // Send the sources chunk immediately so the UI registers the response started
      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
    }

    if (queryEmbedding && docData) {
      // 2. Fetch ALL chunks for this document and rank them in JS
      const { data: chunks, error: chunksError } = await supabase
        .from('document_chunks')
        .select('content, embedding')
        .eq('document_id', documentId);

      if (!chunksError && chunks && chunks.length > 0) {
        let rankedChunks = chunks.map(chunk => ({
          content: chunk.content,
          similarity: cosineSimilarity(queryEmbedding, chunk.embedding)
        }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 4);

        contextText = rankedChunks.map(r => r.content).join('\n\n');
      }
    }

    // Fallback to start of document
    if (!contextText && docData) {
      contextText = docData.content ? docData.content.substring(0, 4000) : "No text found.";
    }

    // 3. Create model with professional system instructions
    const systemPrompt = `You are a professional, highly intelligent AI Assistant. You have access to immense general knowledge.
    
    CRITICAL INSTRUCTIONS:
    1. Tone: Formal, helpful, and direct.
    2. Try to answer the user's question using the 'Info' section below if it's relevant.
    3. If the 'Info' section does NOT contain the answer, YOU MUST use your immense general knowledge to answer the question perfectly and fully. 
    4. NEVER say "The document doesn't say", "I cannot find this in the context", or apologize. Just answer the question directly.
    5. Never use the words "PDF", "Context", "Document", or "Info" in your reply. Act like you just know the answer.`;

    const fallbackModels = [
      "gemini-2.5-flash",
      "gemini-1.5-flash-latest",
      "gemini-1.5-pro-latest",
      "gemini-pro"
    ];

    let formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })).filter(msg => {
      return !msg.parts[0].text.includes('[Quota Reached]') && !msg.parts[0].text.includes('[System Error]');
    });

    while (formattedHistory.length > 0 && formattedHistory[0].role !== 'user') {
      formattedHistory.shift();
    }

    // Ensure history alternates roles for Gemini safety
    const safeHistory = [];
    formattedHistory.forEach((msg, idx) => {
      if (idx === 0 || msg.role !== safeHistory[safeHistory.length - 1].role) {
        safeHistory.push(msg);
      }
    });

    console.log(`🤖 [Chat] History count: ${safeHistory.length} items.`);

    // Handle the retry loop with instantaneous model fallback
    let streamAttempt = 0;
    const maxStreamRetries = fallbackModels.length;
    let streamSuccess = false;

    while (streamAttempt < maxStreamRetries && !streamSuccess) {
      try {
        const modelName = fallbackModels[streamAttempt];
        console.log(`[Chat] Attempt ${streamAttempt + 1}: Using model ${modelName}`);

        const currentModel = getChatModel(systemPrompt + "\n\n" + (contextText ? `Info:\n${contextText}` : ""), modelName);

        const chat = currentModel.startChat({
          history: safeHistory,
          generationConfig: { maxOutputTokens: 1500, temperature: 0.4 },
        });

        const result = await chat.sendMessageStream(message);

        for await (const chunk of result.stream) {
          const txt = chunk.text();
          if (txt) res.write(`data: ${JSON.stringify({ type: 'content', content: txt })}\n\n`);
        }

        streamSuccess = true;
      } catch (err) {
        if (err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('Quota'))) {
          console.warn(`[Gemini API] Quota hit on ${fallbackModels[streamAttempt]}, falling back instantly to next model...`);
          streamAttempt++;
          if (streamAttempt >= maxStreamRetries) throw err;
        } else {
          throw err;
        }
      }
    }

    res.write('data: [DONE]\n\n');
    isStreamClosed = true;
    res.end();


  } catch (error) {
    if (error.cause) console.error('🛑 [Chat ERROR] Cause:', error.cause.message || error.cause);
    console.error('🛑 [Chat ERROR]:', error);

    // Format friendly error for the UI
    let uiErrorMsg = `[System Error: ${error.message}]`;
    if (error.message && (error.message.includes('503') || error.message.includes('Service Unavailable') || error.message.includes('high demand'))) {
      uiErrorMsg = `\n\n[AI Load: The Gemini AI is currently experiencing high demand. Please try asking your question again in a few moments.]`;
    } else if (error.message && error.message.includes('429')) {
      uiErrorMsg = `\n\n[Quota Reached: The AI has reached its rate limit. Please try again later.]`;
    } else if (error.message && error.message.includes('Safety Filter')) {
      uiErrorMsg = `\n\n[Content blocked by safety filters. Please rephrase your question.]`;
    }

    if (!res.headersSent) {
      res.status(200).setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
      const fallbackMsg = `\n\n${uiErrorMsg}\n\n**Relevant Document Section Backup:**\n\n${contextText ? contextText.substring(0, 500) : "No context available."}`;
      res.write(`data: ${JSON.stringify({ type: 'content', content: fallbackMsg })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else if (!isStreamClosed) {
      res.write(`data: ${JSON.stringify({ type: 'content', content: uiErrorMsg })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    }
  }
});

export default router;
