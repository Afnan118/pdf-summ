import { supabase } from './utils/supabase.js';
import { generateEmbedding } from './utils/gemini.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function diagnose() {
    console.log('🔍 Starting Connectivity Diagnosis...');
    
    // 1. Check Supabase
    console.log('\n--- Step 1: Supabase Connectivity ---');
    try {
        const { data, error } = await supabase.from('documents').select('id').limit(1);
        if (error) {
            console.error('❌ Supabase Query Error:', error.message);
        } else {
            console.log('✅ Supabase Connected. Found documents:', data.length);
        }
    } catch (e) {
        console.error('❌ Supabase Catch Error:', e.message);
    }

    // 2. Check Gemini
    console.log('\n--- Step 2: Gemini AI Connectivity ---');
    try {
        const embedding = await generateEmbedding('Hello performance test');
        if (embedding && embedding.length > 0) {
            console.log('✅ Gemini Embedding Gen: Success (Length:', embedding.length, ')');
        } else {
            console.error('❌ Gemini Embedding Gen: Empty result');
        }
    } catch (e) {
        console.error('❌ Gemini Catch Error:', e.message);
    }
    
    console.log('\n--- Diagnosis Complete ---');
}

diagnose();
