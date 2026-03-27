import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkDocs() {
  try {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, filename, user_id, content');
    
    if (error) throw error;
    
    console.log("--- Current Documents in Storage ---");
    docs.forEach(doc => {
      console.log(`ID: ${doc.id} | Name: ${doc.filename} | User: ${doc.user_id} | Content length: ${doc.content ? doc.content.length : 0}`);
    });
  } catch (e) {
    console.error("❌ Failed to fetch docs:", e.message);
  }
}

checkDocs();
