import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'db.rqumsfeezsttbqatidyz.supabase.co',
  database: 'postgres',
  password: process.env.DATABASE_PASSWORD,
  port: 5432, // Direct connection for DDL
  ssl: { rejectUnauthorized: false }
});

async function createTables() {
  try {
    console.log('🚀 Creating chat_sessions table via direct connection...');
    
    // 1. Create chat_sessions table with SERIAL ID (universally supported)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        title TEXT DEFAULT 'New Conversation',
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `);
    
    // 2. Add an index for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS chat_sessions_user_doc_idx ON chat_sessions(user_id, document_id);
    `);

    console.log('✅ Chat tables created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating tables:', err);
    process.exit(1);
  }
}

createTables();
