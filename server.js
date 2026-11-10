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
// Copes with how Windows editors save files: UTF-8 with or without BOM, UTF-16, CRLF line endings.
const envFile = path.join(__dirname, '.env');
const envFound = fs.existsSync(envFile);
if (envFound) {
  const buf = fs.readFileSync(envFile);
  let text;
  if (buf[0] === 0xFF && buf[1] === 0xFE) text = buf.slice(2).toString('utf16le');
  else if (buf[0] === 0xFE && buf[1] === 0xFF) text = Buffer.from(buf.slice(2)).swap16().toString('utf16le');
  else text = buf.toString('utf8');
  text = text.replace(/^﻿/, '');
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toUpperCase();
    const val = m[2].trim().replace(/^["']|["']$/g, '').trim();
    if (val && !process.env[key]) process.env[key] = val;
  }
}

const PORT = Number(process.env.PORT) || 3000;
// HOST=0.0.0.0 lets your phone reach the server over Wi-Fi (for Expo or the phone browser).
// Leave it out to keep the server private to this computer.
const HOST = process.env.HOST || '127.0.0.1';
function lanAddresses() {
  return Object.values(require('os').networkInterfaces()).flat()
    .filter(a => a && a.family === 'IPv4' && !a.internal).map(a => a.address);
}
// Optional app password. If set, the phone app must send the same value
// (EXPO_PUBLIC_LADLE_TOKEN in mobile/.env.local), so others on the Wi-Fi can't use your AI quota.
const LADLE_TOKEN = process.env.LADLE_TOKEN || '';

// Which AI to use: "gemini" (free tier) or "claude" (paid). Set AI_PROVIDER in .env.
const PROVIDER = (process.env.AI_PROVIDER || (process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY ? 'claude' : 'gemini')).toLowerCase();
const API_KEY = PROVIDER === 'gemini' ? (process.env.GEMINI_API_KEY || '') : (process.env.ANTHROPIC_API_KEY || '');
const KEY_NAME = PROVIDER === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY';

// Which model each "modelTier" in the app uses. Change these in .env.
const DEFAULT_MODELS = {
  claude: { quick: 'claude-haiku-5-5', default: 'claude-sonnet-5-5', complex: 'claude-opus-5-5' },
  gemini: { quick: 'gemini-2.5-flash', default: 'gemini-2.5-flash', complex: 'gemini-2.5-pro' }
};
const MODELS = {
  quick: process.env.MODEL_QUICK || DEFAULT_MODELS[PROVIDER]?.quick,     // ideas, chat, calorie estimates
  default: process.env.MODEL_DEFAULT || DEFAULT_MODELS[PROVIDER]?.default, // full recipes, photo analysis
  complex: process.env.MODEL_COMPLEX || DEFAULT_MODELS[PROVIDER]?.complex
};
const MAX_TOKENS = { quick: 4000, default: 8000, complex: 8000 }; // room for Gemini 2.5 "thinking" tokens too
const JSON_RULE = 'Reply with only valid JSON that matches the requested shape. No markdown code fences, no commentary before or after.';

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

function errorCode(status) {
  return status === 429 || status === 529 || status === 503 ? 'rate_limited' : (status === 401 || status === 403) ? 'not_granted' : 'server_error';
}

// ---- Claude API ----
async function callClaude(model, maxTokens, messages, json) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages, ...(json ? { system: JSON_RULE } : {}) })
  });
  const data = await r.json();
  if (!r.ok) return { status: r.status, error: data?.error?.message || 'Claude API error' };
  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return { text, truncated: data.stop_reason === 'max_tokens' };
}

// ---- Google Gemini API (has a free tier: get a key at aistudio.google.com/apikey) ----
async function callGemini(model, maxTokens, messages, json) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: typeof m.content === 'string'
      ? [{ text: m.content }]
      : m.content.map(b => b.type === 'image'
          ? { inline_data: { mime_type: b.source.media_type, data: b.source.data } }
          : { text: b.text })
  }));
  const body = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, ...(json ? { responseMimeType: 'application/json' } : {}) },
    ...(json ? { systemInstruction: { parts: [{ text: JSON_RULE }] } } : {})
  };
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!r.ok) return { status: r.status, error: data?.error?.message || 'Gemini API error' };
  const cand = (data.candidates || [])[0];
  if (!cand) return { status: 400, code: 'refused', error: data?.promptFeedback?.blockReason || 'No answer returned' };
  const text = (cand.content?.parts || []).map(p => p.text || '').join('');
  return { text, truncated: cand.finishReason === 'MAX_TOKENS' };
}

async function handleSample(req, res) {
  if (!API_KEY) return send(res, 500, { error: { code: 'not_granted', message: `No ${KEY_NAME} set. Add it to your .env file.` } });
  let body;
  try { body = JSON.parse(await readBody(req)); }
  catch (e) { return send(res, 400, { error: { code: 'bad_request', message: e.message === 'too_large' ? 'The request is too large.' : 'Invalid JSON.' } }); }

  const tier = MODELS[body.modelTier] ? body.modelTier : 'default';
  let messages;
  try { messages = toMessages(body.input, body.images); }
  catch (e) { return send(res, 400, { error: { code: 'bad_request', message: e.message } }); }

  const call = PROVIDER === 'gemini' ? callGemini : callClaude;
  try {
    const out = await call(MODELS[tier], MAX_TOKENS[tier], messages, !!body.json);
    if (out.error) {
      console.error(`[${PROVIDER}]`, out.status, out.error);
      return send(res, out.status, { error: { code: out.code || errorCode(out.status), message: out.error } });
    }
    send(res, 200, { text: out.text, truncated: out.truncated, model: MODELS[tier] });
  } catch (e) {
    console.error(`[${PROVIDER}] request failed:`, e.message);
    send(res, 502, { error: { code: 'network', message: `Could not reach the ${PROVIDER} API.` } });
  }
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.normalize(path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath));
  const rel = path.relative(ROOT, file);
  // only serve the web app's own files: no ../, no .env, no server code, nothing from the mobile project
  const parts = rel.split(path.sep);
  if (rel.startsWith('..') || path.isAbsolute(rel) || parts.some(p => p.startsWith('.')) || ['mobile', 'node_modules'].includes(parts[0]) || rel === 'server.js' || !TYPES[path.extname(file)]) {
    res.writeHead(404); return res.end('Not found');
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)], 'cache-control': 'no-store' });
    res.end(buf);
  });
}

http.createServer((req, res) => {
  // let the Expo web preview (a different port) call the API too
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-ladle-token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  // the password is only checked for other devices; the web app on this computer works without it
  const fromThisComputer = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  if (req.url.startsWith('/api/') && LADLE_TOKEN && !fromThisComputer && req.headers['x-ladle-token'] !== LADLE_TOKEN) {
    return send(res, 401, { ok: false, error: 'Wrong or missing app password. Set EXPO_PUBLIC_LADLE_TOKEN in mobile/.env.local to match LADLE_TOKEN.', code: 'unauthorized' });
  }
  if (req.url === '/api/health') return send(res, 200, API_KEY ? { ok: true, provider: PROVIDER } : { ok: false, error: `No ${KEY_NAME} in the server's .env` });
  if (req.url === '/api/sample' && req.method === 'POST') return handleSample(req, res);
  if (req.method === 'GET') return serveStatic(req, res);
  res.writeHead(405); res.end();
}).listen(PORT, HOST, () => {
  console.log(`Ladle Kitchen running at http://localhost:${PORT}  (AI: ${PROVIDER}, models: ${MODELS.quick} / ${MODELS.default})`);
  if (HOST === '0.0.0.0') {
    const ips = lanAddresses();
    if (ips.length) console.log(`On your phone (same Wi-Fi): ${ips.map(ip => `http://${ip}:${PORT}`).join('  or  ')}`);
    console.log(LADLE_TOKEN
      ? 'App password is on: phones must send the matching EXPO_PUBLIC_LADLE_TOKEN.'
      : 'Anyone on this Wi-Fi can use the app (and your AI quota) while it runs. Set LADLE_TOKEN in .env to require a password.');
  }
  if (!API_KEY) {
    if (!envFound) {
      const lookalikes = fs.readdirSync(__dirname).filter(f => /^\.?env/i.test(f) && f !== '.env.example');
      console.log(`\nNo .env file found in ${__dirname}`);
      if (lookalikes.length) console.log(`Found ${lookalikes.join(', ')} instead. Rename it to exactly ".env".`);
      else console.log('Create one: copy .env.example, rename the copy to ".env", then add your key.');
    } else {
      console.log(`\n.env was found, but ${KEY_NAME} is empty in it.`);
      console.log(`Add a line like:  ${KEY_NAME}=your-key   (no spaces or quotes needed), save, and restart.`);
    }
    console.log('The app still runs, but the AI features are off until a key is set.\n');
  }
});
