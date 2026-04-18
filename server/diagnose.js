import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logFile = join(__dirname, 'diagnostic.log');
const stream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  stream.write(line);
}

log('--- STARTING DEEP DIAGNOSTIC ---');
log(`Node Version: ${process.version}`);
log(`Directory: ${__dirname}`);

// 1. Kill everything on 3005 and 3004
import { execSync } from 'child_process';
try {
  log('Clearing ports 3004 and 3005...');
  execSync('taskkill /F /IM node.exe', { stdio: 'ignore' });
} catch (e) {}

// 2. Start server.js
log('Launching server.js...');
const server = spawn('node', ['server.js'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'pipe'
});

server.stdout.on('data', (data) => {
  log(`[SERVER STDOUT] ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
  log(`[SERVER STDERR] ${data.toString().trim()}`);
});

server.on('close', (code) => {
  log(`[SERVER EXIT] Code: ${code}`);
});

// 3. Wait and check health
setTimeout(async () => {
  log('Performing local health check via 127.0.0.1:3005...');
  try {
    const res = await fetch('http://127.0.0.1:3005/api/health');
    const data = await res.json();
    log(`[HEALTH OK] ${JSON.stringify(data)}`);
  } catch (err) {
    log(`[HEALTH FAILED] ${err.message}`);
  }
  
  log('--- DIAGNOSTIC COMPLETE ---');
  log('Please send me the contents of "server/diagnostic.log"');
}, 5000);
