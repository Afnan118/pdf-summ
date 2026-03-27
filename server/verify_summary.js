import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifySummary() {
  try {
    const { data: doc, error } = await supabase.from('documents').select('short_summary, detailed_summary').eq('id', 3).single();
    if (error) throw error;
    console.log("--- Summary in Database for Doc 3 ---");
    console.log("Short Summary:", doc.short_summary);
    console.log("Detailed Summary:", doc.detailed_summary ? "PRESENT" : "MISSING");
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}
verifySummary();
