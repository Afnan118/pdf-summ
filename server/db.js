import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use object properties to avoid URI parsing issues with special characters in password
// Switching to port 6543 for Supabase Connection Pooler (more stable than 5432)
const pool = new Pool({
  user: 'postgres',
  host: 'db.rqumsfeezsttbqatidyz.supabase.co',
  database: 'postgres',
  password: process.env.DATABASE_PASSWORD,
  port: 6543,
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
