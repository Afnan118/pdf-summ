import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  user: 'postgres',
  host: 'db.rqumsfeezsttbqatidyz.supabase.co',
  database: 'postgres',
  password: '3186@Yenepoya',
  port: 6543,
  ssl: { rejectUnauthorized: false }
});

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

