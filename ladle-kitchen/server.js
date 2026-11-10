/*
 * server.js — a tiny local server for Ladle Kitchen. No packages needed (Node 18+).
 *
 * 1. Serves index.html, styles.css and js/ to your browser.
 * 2. Forwards AI requests from the app (POST /api/sample) to the Claude API,
 *    so your API key stays on the server and never reaches the browser.
 *
 * Run:  npm start   (or: node server.js)  then open http://localhost:3000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---- load .env (KEY=VALUE lines) without any package ----
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
// Which Claude model each "modelTier" in the app uses. Change these in .env.
const MODELS = {
  quick: process.env.MODEL_QUICK || 'claude-haiku-5-5',      // ideas, chat, calorie estimates
  default: process.env.MODEL_DEFAULT || 'claude-sonnet-5-5', // full recipes, photo analysis
  complex: process.env.MODEL_COMPLEX || 'claude-opus-5-5'
};
const MAX_TOKENS = { quick: 2000, default: 8000, complex: 8000 };

const ROOT = __dirname;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function send(res, status, obj) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 40 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Turn the app's input (a string, or [{role, content}] turns) into Claude API messages.
function toMessages(input, images) {
  let msgs = typeof input === 'string'
    ? [{ role: 'user', content: input }]
    : (Array.isArray(input) ? input : []).map(t => ({ role: t.role === 'assistant' ? 'assistant' : 'user', content: String(t.content || '') }));
  // merge back-to-back turns from the same role (the API needs them to alternate)
  msgs = msgs.reduce((out, m) => {
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.content; else out.push({ ...m });
    return out;
  }, []);
  if (!msgs.length || msgs[msgs.length - 1].role !== 'user') throw new Error('The last turn must be from the user.');
  if (images && images.length) {
    const last = msgs[msgs.length - 1];
    last.content = [
      ...images.map(img => ({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })),
      { type: 'text', text: last.content }
    ];
  }
  return msgs;
}

async function handleSample(req, res) {
  if (!API_KEY) return send(res, 500, { error: { code: 'not_granted', message: 'No ANTHROPIC_API_KEY set. Add it to your .env file.' } });
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return send(res, 400, { error: { code: 'bad_request', message: e.message === 'too_large' ? 'The request is too large.' : 'Invalid JSON.' } }); }

  const tier = MODELS[body.modelTier] ? body.modelTier : 'default';
  let messages;
  try { messages = toMessages(body.input, body.images); }
  catch (e) { return send(res, 400, { error: { code: 'bad_request', message: e.message } }); }

  const payload = {
    model: MODELS[tier],
    max_tokens: MAX_TOKENS[tier],
    messages,
    ...(body.json ? { system: 'Reply with only valid JSON that matches the requested shape. No markdown code fences, no commentary before or after.' } : {})
  };

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    if (!r.ok) {
      const code = r.status === 429 || r.status === 529 ? 'rate_limited' : r.status === 401 ? 'not_granted' : 'server_error';
      console.error('[Claude API]', r.status, data?.error?.message || data);
      return send(res, r.status, { error: { code, message: data?.error?.message || 'Claude API error' } });
    }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    send(res, 200, { text, truncated: data.stop_reason === 'max_tokens', model: data.model, usage: data.usage });
  } catch (e) {
    console.error('[Claude API] request failed:', e.message);
    send(res, 502, { error: { code: 'network', message: 'Could not reach the Claude API.' } });
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  const rel = path.relative(ROOT, file);
  // only serve the app's own files: no ../, no .env, no server code
  if (rel.startsWith('..') || path.isAbsolute(rel) || rel.split(path.sep).some(p => p.startsWith('.')) || rel === 'server.js' || !TYPES[path.extname(file)]) {
    res.writeHead(404); return res.end('Not found');
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)], 'cache-control': 'no-store' });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  if (req.url === '/api/health') return send(res, 200, API_KEY ? { ok: true } : { ok: false, error: 'No ANTHROPIC_API_KEY in .env' });
  if (req.url === '/api/sample' && req.method === 'POST') return handleSample(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405); res.end();
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Ladle Kitchen running at http://localhost:${PORT}`);
  if (!API_KEY) console.log('Warning: no ANTHROPIC_API_KEY found. Copy .env.example to .env and add your key to turn on the AI.');
});
