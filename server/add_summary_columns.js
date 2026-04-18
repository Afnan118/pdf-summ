import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const pool = new Pool({
  user: 'postgres',
  host: process.env.SUPABASE_DB_HOST || 'localhost',
  database: 'postgres',
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.SUPABASE_DB_PORT_DIRECT || '5432'),
  ssl: { rejectUnauthorized: false }
});

async function addColumns() {
  try {
    console.log('🚀 Adding summary columns to documents table...');
    
    await pool.query(`
      ALTER TABLE documents 
      ADD COLUMN IF NOT EXISTS short_summary TEXT,
      ADD COLUMN IF NOT EXISTS detailed_summary TEXT,
      ADD COLUMN IF NOT EXISTS key_points TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
    `);

    console.log('✅ Columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding columns:', err);
    process.exit(1);
  }
}

addColumns();
