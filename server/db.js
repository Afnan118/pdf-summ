import pg from 'pg';
import dotenv from 'dotenv';

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config(); // Fallback to current dir .env

const { Pool } = pg;

// Use object properties to avoid URI parsing issues with special characters in password
// Switching to port 6543 for Supabase Connection Pooler (more stable than 5432)
const pool = new Pool({
  user: 'postgres',
  host: process.env.SUPABASE_DB_HOST || 'localhost',
  database: 'postgres',
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.SUPABASE_DB_PORT || '6543'),
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

// Log connection attempts
pool.on('connect', () => {
  console.log('📦 New client connected to the pool');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
});

export default pool;
