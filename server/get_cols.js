import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function getCols() {
  try {
    const { data: cols, error } = await supabase.from('documents').select('*').limit(1);
    if (error) throw error;
    if (cols.length === 0) {
      console.log("No rows in documents table to inspect.");
      return;
    }
    console.log("--- Available Columns in 'documents' table ---");
    console.log(Object.keys(cols[0]));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}
getCols();
