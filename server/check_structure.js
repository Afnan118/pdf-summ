import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStructure() {
  const tables = ['chats', 'conversations', 'messages'];
  for (const table of tables) {
    const { data: columns, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`Error reading ${table}: ${error.message}`);
    } else {
      console.log(`\nTable ${table} structure (first row or empty):`);
      console.log(columns[0] || 'Empty table');
    }
  }
}

checkStructure();
