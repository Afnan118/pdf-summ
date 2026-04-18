import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';

// Create a clean, native Supabase client
let supabase;
try {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
} catch (err) {
  console.error('❌ Failed to initialize Supabase client:', err.message);
  // Fallback to a dummy client structure to prevent immediate crashes on import
  supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: err }) }),
      delete: () => ({ eq: () => ({ eq: () => ({ select: () => Promise.resolve({ data: null, error: err }) }) }) }) })
    })
  };
}

export { supabase };

if (SUPABASE_URL === 'https://dummy.supabase.co') {
  console.warn(`[Init] ⚠️ WARNING: SUPABASE_URL is missing. Supabase client initialized with dummy values.`);
} else {
  console.log(`[Init] 🚀 Native Supabase Client initialized for ${SUPABASE_URL}`);
}
