import express from 'express';
import { supabase } from './utils/supabase.js';
import uploadRouter from './routes/upload.js';
import chatRouter from './routes/chat.js';
import documentsRouter from './routes/documents.js';
import summarizeRouter from './routes/summarize.js';
import cors from 'cors';
import dns from 'dns';

// Final Network Hardening
if (dns.setDefaultResultOrder) { dns.setDefaultResultOrder('ipv4first'); }

const app = express();
const port = 3005;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/upload', uploadRouter);
app.use('/api/chat', chatRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/summarize', summarizeRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.listen(port, () => {
  console.log(`🚀 Server is LIVE on port ${port}`);
  console.log(`✅ Ready for PDF Uploads!`);
});

process.on('uncaughtException', (err) => console.error('FATAL:', err.message));
process.on('unhandledRejection', (reason) => console.error('REJECTION:', reason));
