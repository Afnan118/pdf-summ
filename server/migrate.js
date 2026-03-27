import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('--- Migrating Database Schema ---');
  
  // We can't easily alter a vector column dimension directly in some pgvector versions 
  // without dropping and recreating or using a trick.
  // We'll try to drop the column and recreate it if it's the wrong dimension.
  
  const sql = `
    -- Drop and recreate the embedding column with 768 dimensions
    ALTER TABLE document_chunks DROP COLUMN IF EXISTS embedding;
    ALTER TABLE document_chunks ADD COLUMN embedding vector(768);
    
    -- Recreate the index
    DROP INDEX IF EXISTS document_chunks_embedding_idx;
    CREATE INDEX document_chunks_embedding_idx 
    ON document_chunks USING hnsw (embedding vector_cosine_ops);
  `;

  // Note: supabase-js doesn't have a direct 'sql' method for raw queries unless using a custom RPC or being a superuser.
  // But wait, Supabase has an 'rpc' method. If the user doesn't have a 'exec_sql' function, this will fail.
  // Most people don't have it by default.
  
  console.log('Sending migration instructions via SQL is better via the dashboard, but I will try to verify the current state.');
  
  const { data, error } = await supabase.from('document_chunks').select('embedding').limit(1);
  if (error) {
    console.error('Error checking document_chunks:', error.message);
  } else {
    console.log('Check complete. If uploads still fail with "dimension mismatch", please run the SQL in schema.sql in your Supabase SQL Editor.');
  }
}

migrate();
