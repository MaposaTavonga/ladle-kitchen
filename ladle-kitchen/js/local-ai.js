/*
 * local-ai.js — lets Ladle run outside Claude.
 *
 * Inside a Claude artifact, the page gets `window.claude` from Claude itself
 * (AI, account storage, user info). On your own computer that doesn't exist,
 * so this file creates a stand-in that sends AI requests to server.js, which
 * calls the Claude API with your own API key.
 *
 * - claude.use('sample') -> the AI, through POST /api/sample
 * - claude.use('db') and claude.use('user') -> null, so the app saves the
 *   profile and calorie log in the browser (localStorage) instead.
 */
(function () {
  if (window.claude && window.claude.use) return; // running inside Claude: do nothing

  const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  let serverUp = null; // cached result of the health check

  async function checkServer() {
    if (serverUp !== null) return serverUp;
    try {
      const r = await fetch('/api/health');
      const j = await r.json();
      serverUp = !!j.ok;
      if (!serverUp && j.error) console.warn('[Ladle] ' + j.error);
    } catch (e) {
      serverUp = false;
    }
    return serverUp;
  }

  // Read an image File/Blob as base64 (without the "data:...;base64," prefix).
  function toBase64(blob) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1]);
      fr.onerror = () => reject({ code: 'image_rejected', message: 'Could not read the image.' });
      fr.readAsDataURL(blob);
    });
  }

  async function packImages(images) {
    if (!images) return [];
    const list = images instanceof Blob ? [images] : Array.from(images);
    const out = [];
    for (const img of list) {
      if (!MEDIA_TYPES.includes(img.type)) throw { code: 'image_rejected', message: 'Use a JPG, PNG, GIF or WebP image.' };
      out.push({ media_type: img.type, data: await toBase64(img) });
    }
    return out;
  }

  async function call(input, opts, json) {
    opts = opts || {};
    const body = {
      input,
      json,
      modelTier: opts.modelTier || 'default',
      images: await packImages(opts.images)
    };
    let res;
    try {
      res = await fetch('/api/sample', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: opts.signal
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw { code: 'cancelled', message: 'Cancelled.' };
      throw { code: 'network', message: 'Could not reach the local server.' };
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw data.error || { code: 'server_error', message: 'The server returned an error.' };
    if (opts.onText) { try { opts.onText({ text: data.text, delta: data.text }); } catch (e) {} }
    return data;
  }

  function parseJSON(text) {
    let t = String(text || '').trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    try { return JSON.parse(t); } catch (e) {}
    // fall back to the first {...} or [...] block in the answer
    const m = t.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch (e) {} }
    throw { code: 'invalid_json', message: 'The answer was not valid JSON.', text };
  }

  const sample = async (input, opts) => {
    const d = await call(input, opts, false);
    return { text: d.text, truncated: !!d.truncated };
  };
  sample.json = async (input, opts) => parseJSON((await call(input, opts, true)).text);
  sample.limits = async () => ({ images: { maxCount: 5, mediaTypes: MEDIA_TYPES } });

  window.claude = {
    async use(name) {
      if (name === 'sample') return (await checkServer()) ? sample : null;
      return null; // no 'db' or 'user' locally: the app falls back to localStorage
    }
  };
})();
