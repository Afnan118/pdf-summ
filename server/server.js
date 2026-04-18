import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config(); // Fallback to server/.env

import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import summarizeRouter from './routes/summarize.js';

const app = express();
const port = process.env.PORT || 3006;

// 1. Environment Variable Validation
const requiredEnvs = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_DB_HOST',
  'GEMINI_API_KEY'
];

console.log('--- Server Startup: Environment Check ---');
const missingEnvs = requiredEnvs.filter(env => !process.env[env]);

if (missingEnvs.length > 0) {
  console.error('❌ CRITICAL ERROR: Missing environment variables:');
  missingEnvs.forEach(env => console.error(`   - ${env}`));
} else {
  console.log('✅ All required environment variables are present.');
}
console.log('-----------------------------------------');

// Middleware
app.use(cors()); // Permissive CORS for local development
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

  // Request & Auth Middleware
  app.use((req, res, next) => {
    let userId = req.get('x-user-id') || req.query.userId || req.body?.userId || 'supabase-user-temp';
    if (userId === 'supabase-user-temp') {
      userId = '97e6e580-f709-41d3-a44d-37559e38814a';
    }
    
    req.userId = userId;

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`  User-ID: ${req.userId}`);
  next();
});

// Routes
// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/summarize', summarizeRouter);



app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      gemini: !!process.env.GEMINI_API_KEY
    }
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxdW1zZmVlenN0dGJxYXRpZHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwOTU1NzAsImV4cCI6MjA4OTY3MTU3MH0.pRu81y77szq56ig0AbU3svuR-B062AnNMvHczoZY-m0'
  });
});

// Local entry point (must NOT run on Vercel to prevent EACCES/Startup crash)
if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://127.0.0.1:${port}`);
    console.log(`✅ Backend successfully bound to port ${port} (IPv4)`);
  });
}

export default app;


// Global Error Handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});
