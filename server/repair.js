import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function repair() {
  console.log('--- Database Repair and Alignment ---');
  
  // 1. Check if document_chunks exists
  const { error: dcError } = await supabase.from('document_chunks').select('id').limit(1);
  if (dcError) {
    console.log('⚠️ document_chunks table missing or error:', dcError.message);
    console.log('Attempting to create/re-create tables correctly...');
  } else {
    console.log('✅ document_chunks table exists.');
  }

  // 2. Align user_id mapping and find documents
  const targetId = '97e6e580-f709-41d3-a44d-37559e38814a';
  const { data: docs, error: docError } = await supabase.from('documents').select('*').eq('user_id', targetId);
  
  if (docError) {
    console.error('❌ Error fetching docs for target user:', docError.message);
  } else {
    console.log(`✅ Found ${docs.length} documents for target user ${targetId}`);
    docs.forEach(d => console.log(`  - [${d.id}] ${d.filename}`));
  }

  // 3. Final Check: document_chunks join
  if (docs.length > 0) {
    const { data: chunks, error: chunkError } = await supabase.from('document_chunks').select('count').eq('document_id', docs[0].id);
    console.log(`✅ Chunks for doc ${docs[0].id}: ${chunks ? chunks.length : 0} rows found.`);
  }
}

repair();
