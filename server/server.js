import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload.js';
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import summarizeRouter from './routes/summarize.js';

const app = express();
const port = process.env.PORT || 3004;

// 1. Environment Variable Validation
const requiredEnvs = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
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

  // Request & Auth Middleware
  app.use((req, res, next) => {
    // User Identity Reconciliation
    // NOTE: For multipart/form-data (file uploads), req.body might not be populated yet by multer.
    // In that case, we fallback to headers or query params.
    let userId = req.get('x-user-id') || req.query.userId || req.body?.userId || 'supabase-user-temp';
    
    // Stable mapping for temp users
    if (userId === 'supabase-user-temp') {
      userId = '97e6e580-f709-41d3-a44d-37559e38814a';
    }
    
    req.userId = userId;

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`  User-ID: ${req.userId}`);
  
  if (req.method === 'POST' && req.url !== '/api/upload') {
    // Log body but skip file upload binary data
    console.log('  Body:', JSON.stringify(req.body));
  }
  next();
});

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/summarize', summarizeRouter);



app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    env: {
      supabase: !!process.env.SUPABASE_URL,
      gemini: !!process.env.GEMINI_API_KEY
    }
  };
  res.json(healthCheck);
});

// Export app for Vercel
export default app;

// Only listen if not on Vercel
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
    console.log(`✅ Backend successfully bound to port ${port}`);
  });
}

// Global Error Handlers to prevent server crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});
