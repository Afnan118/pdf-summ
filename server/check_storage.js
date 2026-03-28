import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStorage() {
  const { data, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error.message);
    return;
  }
  console.log('Buckets:', data.map(b => b.name));
  const pdfsBucket = data.find(b => b.name === 'pdfs');
  if (pdfsBucket) {
    console.log('✅ "pdfs" bucket exists.');
  } else {
    console.log('❌ "pdfs" bucket MISSING.');
  }
}

checkStorage();
