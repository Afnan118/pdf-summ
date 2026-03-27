import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  const { data, error } = await supabase
    .from('documents')
    .select('id')
    .limit(1);
    
  if (error) {
    console.error('Connection Error:', error.message);
    return;
  }
  console.log('✅ Connected to Supabase.');

  const tables = ['documents', 'chunks', 'chats', 'conversations', 'messages'];
  for (const table of tables) {
    const { error: tableError } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (!tableError) {
      console.log(`Table exists: ${table}`);
    } else {
      console.log(`Table missing or no access: ${table}`);
    }
  }
}

checkTables();
