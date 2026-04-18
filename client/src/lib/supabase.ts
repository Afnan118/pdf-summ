import { createClient, SupabaseClient } from '@supabase/supabase-js';

const INITIAL_URL = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const INITIAL_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

let url = INITIAL_URL;
let key = INITIAL_KEY;

// Use top-level await to ensure the correct configuration is loaded before the module exports
if (url.includes('placeholder')) {
  try {
    const res = await fetch('/api/config');
    const config = await res.json();
    if (config.supabaseUrl && config.supabaseAnonKey) {
      url = config.supabaseUrl;
      key = config.supabaseAnonKey;
    } else {
      console.warn('⚠️ /api/config did not return expected supabaseUrl or supabaseAnonKey');
    }
  } catch (err) {
    console.error('❌ Failed to load dynamic Supabase config from /api/config:', err);
  }
}

if (url.includes('placeholder')) {
  console.error("🚨 CRITICAL: Supabase URL is still 'placeholder'. Client will fail to fetch.");
} else {
  console.log("✅ Supabase Client initialized with URL:", url);
}

export const supabase: SupabaseClient = createClient(url, key);
