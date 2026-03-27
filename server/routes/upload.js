import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { generateEmbedding, chunkText } from '../utils/gemini.js';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Ensure createClient is available
if (typeof createClient === 'undefined') {
  console.error('❌ CRITICAL: createClient is undefined. Check @supabase/supabase-js installation.');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Function to sanitize text for Postgres (removes null bytes and control characters)
function sanitizeText(str) {
  if (!str) return '';
  return str.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
}


router.post('/', upload.single('file'), async (req, res) => {
  const uploadId = Math.random().toString(36).substring(7);
  console.log(`[Upload ${uploadId}] 📥 Received upload request`);
  
  try {
    if (!req.file) {
      console.error(`[Upload ${uploadId}] ❌ No file found in request`);
      return res.status(400).json({ error: 'No file uploaded in the request.' });
    }

    const { originalname, buffer, mimetype } = req.file;
    let text = '';

    // 1. Parse content based on filetype
    console.log(`[Upload ${uploadId}] 🔍 Parsing ${req.file.mimetype} file: ${req.file.originalname}`);
    if (mimetype === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      console.error(`[Upload ${uploadId}] ❌ Unsupported file type: ${mimetype}`);
      return res.status(400).json({ error: 'Unsupported file type. Please use PDF or TXT.' });
    }

    // Sanitize text before any processing or DB insertion
    text = sanitizeText(text);

    console.log(`[Upload ${uploadId}] ✅ Parsing complete. Text length: ${text.length} characters.`);

    if (!text.trim()) {
      console.warn(`[Upload ${uploadId}] ⚠️ Extracted text is empty or invalid.`);
      return res.status(400).json({ error: 'Extracted text is empty or invalid.' });
    }
    console.log(`[Upload ${uploadId}] 📜 Content preview: ${text.substring(0, 100)}...`);

    // 2. Upload file to Supabase Storage (pdfs bucket)
    const fileExt = originalname.split('.').pop() || 'pdf';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    console.log(`[Upload ${uploadId}] ☁️ Attempting storage upload: ${fileName}`);
    let fileUrl = null;
    try {
      const { data: storageData, error: storageError } = await supabase.storage
        .from('pdfs')
        .upload(fileName, buffer, {
          contentType: mimetype,
          upsert: false
        });
      
      if (storageError) {
        console.warn(`[Upload ${uploadId}] ⚠️ Storage upload failed but continuing with text processing:`, storageError.message);
        // We continue because we already have the 'text' parsed in memory
      } else if (storageData) {
        const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);
        fileUrl = publicUrlData.publicUrl;
        console.log(`[Upload ${uploadId}] ✅ Storage upload success: ${fileUrl}`);
      }
    } catch (e) {
      console.warn(`[Upload ${uploadId}] ⚠️ Storage error (ignored):`, e.message);
    }


    // 3. Save document metadata
    const userId = req.userId;
    console.log(`[Upload ${uploadId}] 💾 Saving metadata for user: ${userId}`);
    
    let documentId;
    try {
      // 4. Save document metadata to Supabase 'documents' table
      // Added resilience for large metadata (fetch failed issues)
      let docData, docError;
      let dbRetries = 3;
      while (dbRetries > 0) {
        try {
          console.log(`[Upload ${uploadId}] 💾 Saving metadata (Attempt ${4 - dbRetries})...`);
          const result = await supabase
            .from('documents')
            .insert([{ 
              user_id: userId, 
              filename: originalname, 
              file_url: fileUrl,
              content: text.length > 3000000 ? text.substring(0, 3000000) + "... (truncated for size)" : text 
            }])
            .select()
            .single();
          
          docData = result.data;
          docError = result.error;
          
          if (!docError) break;
          throw docError;
        } catch (dbErr) {
          console.warn(`[Upload ${uploadId}] ⚠️ DB Attempt ${4 - dbRetries} failed:`, dbErr.message);
          dbRetries--;
          if (dbRetries === 0) {
            console.error(`[Upload ${uploadId}] ❌ Supabase DB error (metadata):`, dbErr.message);
            throw new Error(`Failed to save document metadata after 3 attempts: ${dbErr.message}`);
          }
          await new Promise(r => setTimeout(r, 2000)); // Wait 2s before retry
        }
      }
      
      if (docError) throw docError; // Should not happen if loop breaks successfully, but good for type safety
      documentId = docData.id;
      console.log(`[Upload ${uploadId}] ✅ Metadata saved. Document ID: ${documentId}`);
    } catch (dbErr) {
      console.error(`[Upload ${uploadId}] ❌ Supabase DB error (metadata):`, dbErr.message);
      throw new Error(`Failed to save document metadata: ${dbErr.message}`);
    }

    // 4. Chunk text and generate embeddings
    const chunks = chunkText(text);
    console.log(`[Upload ${uploadId}] 🧬 Generating embeddings for ${chunks.length} chunks...`);
    
    const chunkInserts = [];
    for (const chunk of chunks) {
      if (!chunk.trim()) continue;
      
      try {
        const embedding = await generateEmbedding(chunk);
        chunkInserts.push({
          document_id: documentId,
          content: chunk,
          embedding: embedding // supabase-js handles array to pgvector conversion
        });
      } catch (err) {
        console.error(`[Upload ${uploadId}] ❌ Embedding error:`, err.message);
        throw new Error(`Embedding generation failed: ${err.message}`);
      }
    }

    if (chunkInserts.length > 0) {
      const { error: chunkError } = await supabase
        .from('document_chunks')
        .insert(chunkInserts);
      
      if (chunkError) {
        console.error(`[Upload ${uploadId}] ❌ Chunk insertion error:`, chunkError.message);
        throw new Error(`Knowledge Base storage failed: ${chunkError.message}`);
      }
    }


    console.log(`[Upload ${uploadId}] ✨ All chunks processed successfully.`);
    res.json({ message: 'File uploaded and processed successfully', chunks: chunks.length });
  } catch (error) {
    console.error(`[Upload ${uploadId}] 🛑 UNCAUGHT ERROR:`, error);
    res.status(500).json({ error: error.message || 'Internal server error processing file.' });
  }
});

export default router;
