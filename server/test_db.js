import pool from './db.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('Testing connection...');
try {
  const res = await pool.query('SELECT NOW()');
  console.log('✅ Connection successful!', res.rows[0]);
} catch (err) {
  console.error('❌ Connection failed:', err.message);
  console.error('Full error:', err);
} finally {
  await pool.end();
}

