-- AI Customer Support Agent - Supabase Schema
-- Copy and paste this entire file into your Supabase SQL Editor and click "Run".

-- 1. Enable the pgvector extension to work with OpenAI embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create the documents table to store uploaded files metadata
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_url TEXT,
  content TEXT, -- Stores the full extracted text for reference
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create the document_chunks table to store embedding chunks for AI search
CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768), -- 768 dimensions for Google Gemini embeddings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create an index to speed up vector similarity search
-- In pgvector, HNSW (Hierarchical Navigable Small World) is highly recommended for performance
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Set up basic Row Level Security Policies (Optional but Recommended)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow users to see and delete only their own documents
CREATE POLICY "Users can manage their own documents" 
ON documents 
FOR ALL 
USING (auth.uid()::text = user_id OR user_id = 'supabase-user-temp' OR user_id = 'anonymous');

CREATE POLICY "Users can manage their own chunks" 
ON document_chunks 
FOR ALL 
USING (document_id IN (SELECT id FROM documents WHERE auth.uid()::text = user_id OR user_id = 'supabase-user-temp' OR user_id = 'anonymous'));

-- Note: The above RLS policies are permissive for testing. 
-- Once you integrate full backend Supabase auth validation, you can restrict it further.
