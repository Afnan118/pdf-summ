import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function verifySummary() {
  try {
    const { data: docs, error } = await supabase.from('documents').select('id, filename, short_summary, detailed_summary').order('id', { ascending: false }).limit(3);
    if (error) throw error;
    console.log("--- Summary Status for Latest 3 Documents ---");
    docs.forEach(doc => {
      console.log(`ID: ${doc.id} | File: ${doc.filename}`);
      console.log(`   Short Summary: ${doc.short_summary ? "PRESENT" : "MISSING"}`);
      console.log(`   Detailed Summary: ${doc.detailed_summary ? "PRESENT" : "MISSING"}`);
    });
  } catch (e) {
    console.error("❌ Failed:", e.message);
  }
}
verifySummary();
