import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkSchema() {
  try {
    // There is no easy way to get column types from supabase-js easily, 
    // but we can check a single record's type.
    const { data, error } = await supabase.from('documents').select('id').limit(1).single();
    if (error) throw error;
    console.log(`Document ID type: ${typeof data.id}`);
    console.log(`Document ID value:`, data.id);
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}
checkSchema();
