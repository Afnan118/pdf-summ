import express from 'express';
import pdfParse from 'pdf-parse';
import { supabase } from '../utils/supabase.js';
import { generateEmbedding, generateBatchEmbeddings, chunkText } from '../utils/gemini.js';

// No need for multer anymore, bypassing Vercel form-data conflicts
const router = express.Router();

// Function to sanitize text for Postgres
function sanitizeText(str) {
  if (!str) return '';
  return str.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '');
}

router.post('/', async (req, res) => {
  const uploadId = Math.random().toString(36).substring(7);
  console.log(`[Upload ${uploadId}] 📥 Received upload request`);

  try {
    // Accept either: { storagePath, originalname, mimetype, userId }  (new — no body size limit)
    // OR legacy:     { fileBase64, originalname, mimetype, userId }   (old — kept for backward compat)
    const { storagePath, fileBase64, originalname, mimetype, userId } = req.body;

    if (!originalname) {
      console.error(`[Upload ${uploadId}] ❌ No file data found in request`);
      return res.status(400).json({ error: 'No file data in request.' });
    }

    let buffer;
    let fileUrl = null;

    // ── Phase 1: Resolve Buffer and File URL ──
    if (storagePath) {
      // New path: file already in Supabase Storage, just download it for parsing
      console.log(`[Upload ${uploadId}] ☁️ Downloading from Supabase Storage: ${storagePath}`);
      const { data: dlData, error: dlError } = await supabase.storage
        .from('pdfs')
        .download(storagePath);

      if (dlError) {
        console.error(`[Upload ${uploadId}] ❌ Storage download failed:`, dlError.message);
        return res.status(500).json({ error: `Failed to download file from storage: ${dlError.message}` });
      }

      buffer = Buffer.from(await dlData.arrayBuffer());
      const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(storagePath);
      fileUrl = publicUrlData.publicUrl;
      console.log(`[Upload ${uploadId}] ✅ Downloaded ${buffer.length} bytes from storage`);

    } else if (fileBase64) {
      // Legacy path: base64 in body (small files only), needs to be uploaded to storage
      console.log(`[Upload ${uploadId}] 📦 Processing legacy base64 upload`);
      buffer = Buffer.from(fileBase64, 'base64');

      const fileExt = originalname.split('.').pop() || 'pdf';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      console.log(`[Upload ${uploadId}] ☁️ Attempting storage upload: ${fileName}`);
      try {
        const { data: storageData, error: storageError } = await supabase.storage
          .from('pdfs')
          .upload(fileName, buffer, {
            contentType: mimetype,
            upsert: false
          });

        if (storageError) {
          console.warn(`[Upload ${uploadId}] ⚠️ Storage upload failed but continuing with text processing:`, storageError.message);
        } else if (storageData) {
          const { data: publicUrlData } = supabase.storage.from('pdfs').getPublicUrl(fileName);
          fileUrl = publicUrlData.publicUrl;
          console.log(`[Upload ${uploadId}] ✅ Storage upload success: ${fileUrl}`);
        }
      } catch (e) {
        console.warn(`[Upload ${uploadId}] ⚠️ Storage error (ignored):`, e.message);
      }
    } else {
      return res.status(400).json({ error: 'Either storagePath or fileBase64 is required.' });
    }

    // ── Phase 2: Parse Content ──
    let text = '';
    console.log(`[Upload ${uploadId}] 🔍 Parsing ${mimetype} file: ${originalname}`);
    if (mimetype === 'application/pdf') {
      const pdfData = await pdfParse(buffer);
      text = pdfData.text;
    } else if (mimetype === 'text/plain') {
      text = buffer.toString('utf-8');
    } else {
      console.error(`[Upload ${uploadId}] ❌ Unsupported file type: ${mimetype}`);
      return res.status(400).json({ error: 'Unsupported file type. Please use PDF or TXT.' });
    }

    text = sanitizeText(text);
    console.log(`[Upload ${uploadId}] ✅ Parsing complete. Text length: ${text.length} characters.`);

    if (!text.trim()) {
      console.warn(`[Upload ${uploadId}] ⚠️ Extracted text is empty or invalid.`);
      return res.status(400).json({ error: 'Extracted text is empty or invalid.' });
    }
    console.log(`[Upload ${uploadId}] 📜 Content preview: ${text.substring(0, 100)}...`);


    // ── Phase 3: Save Document Metadata ──
    console.log(`[Upload ${uploadId}] 💾 Saving metadata for user: ${userId}`);
    let documentId;
    let docData = null;
    let attempt = 0;
    const maxRetries = 5;

    while (attempt < maxRetries) {
      try {
        const { data, error: docError } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            filename: originalname,
            file_url: fileUrl,
            content: text.length > 500000 ? text.substring(0, 500000) + "... (truncated for size)" : text
          })
          .select()
          .single();

        if (docError) throw docError;
        docData = data;
        break; // Success
      } catch (dbErr) {
        attempt++;
        console.warn(`[Upload ${uploadId}] ⚠️ DB Attempt ${attempt} failed:`, dbErr.message);
        if (attempt >= maxRetries) {
          console.error(`[Upload ${uploadId}] ❌ Supabase DB error (metadata) after ${maxRetries} tries:`, dbErr.message);
          throw new Error(`Failed to save document metadata: ${dbErr.message}`);
        }
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }

    documentId = docData?.id;
    if (!documentId) {
      throw new Error(`Failed to retrieve document identity after successful save.`);
    }
    console.log(`[Upload ${uploadId}] ✅ Metadata saved. Document ID: ${documentId}`);

    // ── Phase 4: Chunk Text and Generate Embeddings ──
    let chunks = chunkText(text);
    chunks = chunks.filter(c => c.trim().length > 0);
    console.log(`[Upload ${uploadId}] 🧬 Generating BATCH embeddings for ${chunks.length} chunks...`);

    let embeddings = [];
    if (chunks.length > 0) {
      try {
        embeddings = await generateBatchEmbeddings(chunks);
      } catch (err) {
        console.error(`[Upload ${uploadId}] ❌ Batch Embedding error:`, err.message);
        throw new Error(`Batch Embedding generation failed: ${err.message}`);
      }
    }

    const chunkInserts = [];
    for (let i = 0; i < chunks.length; i++) {
      if (embeddings[i]) {
        chunkInserts.push({
          document_id: documentId,
          content: chunks[i],
          embedding: embeddings[i]
        });
      }
    }

    if (chunkInserts.length > 0) {
      let chunkAttempt = 0;
      let chunkSuccess = false;
      let lastChunkError = null;

      while (chunkAttempt < maxRetries) {
        try {
          const { error: chunkError } = await supabase
            .from('document_chunks')
            .insert(chunkInserts);

          if (chunkError) throw chunkError;
          chunkSuccess = true;
          break;
        } catch (cErr) {
          chunkAttempt++;
          lastChunkError = cErr;
          console.warn(`[Upload ${uploadId}] ⚠️ Chunk Insert Attempt ${chunkAttempt} failed:`, cErr.message);
          if (chunkAttempt < maxRetries) {
            await new Promise(r => setTimeout(r, chunkAttempt * 2000));
          }
        }
      }

      if (!chunkSuccess) {
        console.error(`[Upload ${uploadId}] ❌ Chunk insertion error after ${maxRetries} tries:`, lastChunkError?.message);
        throw new Error(`Knowledge Base storage failed: ${lastChunkError?.message}`);
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
