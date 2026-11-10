// Talks to the Ladle server (server.js), which calls Gemini or Claude.
// The phone never holds an AI key: it only knows the server's address.
import type { Photo } from './types';

/** Set in mobile/.env as EXPO_PUBLIC_API_URL, e.g. http://192.168.1.23:3000 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
const APP_TOKEN = process.env.EXPO_PUBLIC_LADLE_TOKEN ?? '';

export type Tier = 'quick' | 'default' | 'complex';
export type Turn = { role: 'user' | 'assistant'; content: string };
export type AskOptions = { tier?: Tier; images?: Photo[]; signal?: AbortSignal };

export class AIError extends Error {
  code: string;
  partial?: string;
  constructor(code: string, message: string, partial?: string) {
    super(message);
    this.code = code;
    this.partial = partial;
  }
}

function headers(): Record<string, string> {
  return { 'content-type': 'application/json', ...(APP_TOKEN ? { 'x-ladle-token': APP_TOKEN } : {}) };
}

async function call(input: string | Turn[], json: boolean, opts: AskOptions = {}) {
  if (!API_URL) throw new AIError('no_server', 'No server address set. Add EXPO_PUBLIC_API_URL to mobile/.env and restart Expo.');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/sample`, {
      method: 'POST',
      headers: headers(),
      signal: opts.signal,
      body: JSON.stringify({
        input,
        json,
        modelTier: opts.tier ?? 'default',
        images: (opts.images ?? []).map(p => ({ media_type: p.mimeType, data: p.base64 })),
      }),
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw new AIError('cancelled', 'Cancelled.');
    throw new AIError('network', `Can't reach the Ladle server at ${API_URL}. Check it's running and your phone is on the same Wi-Fi.`);
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error;
    const code = typeof err === 'object' && err?.code ? err.code : data?.code ?? 'server_error';
    const message = typeof err === 'string' ? err : err?.message ?? 'The server returned an error.';
    throw new AIError(code, message);
  }
  return { text: String(data.text ?? ''), truncated: !!data.truncated };
}

/** Plain-text answer (Chef chat). */
export function ask(input: string | Turn[], opts?: AskOptions) {
  return call(input, false, opts);
}

/** Structured answer: parses the JSON the AI returns. */
export async function askJSON<T = any>(prompt: string, opts?: AskOptions): Promise<T> {
  const { text } = await call(prompt, true, opts);
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  try { return JSON.parse(t); } catch {}
  const m = t.match(/[\[{][\s\S]*[\]}]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  throw new AIError('invalid_json', 'The answer came back in the wrong shape.', text);
}

/** Quick check used on the home screen so problems show up early. */
export async function checkServer(): Promise<{ ok: boolean; message?: string; provider?: string }> {
  if (!API_URL) return { ok: false, message: 'No server address set. Add EXPO_PUBLIC_API_URL to mobile/.env, then restart Expo.' };
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(`${API_URL}/api/health`, { signal: ctl.signal, headers: headers() });
    const j: any = await r.json();
    return j.ok ? { ok: true, provider: j.provider } : { ok: false, message: j.error ?? 'The server has no AI key set.' };
  } catch {
    return { ok: false, message: `Can't reach the Ladle server at ${API_URL}. Start it with "npm start" on your computer, and make sure your phone is on the same Wi-Fi.` };
  } finally {
    clearTimeout(t);
  }
}

/** A friendly message for any error, or null if the user cancelled. */
export function aiMessage(e: unknown): string | null {
  const err = e as AIError;
  switch (err?.code) {
    case 'cancelled': return null;
    case 'rate_limited': return 'The AI is busy or you hit the free limit. Wait a minute, then try again.';
    case 'not_granted': return 'The AI key on the server was rejected. Check the key in your .env file.';
    case 'invalid_json': return 'The answer came back in the wrong shape. Try again.';
    case 'refused': return "The AI wouldn't answer that one. Try asking a different way.";
    case 'no_dish': return "I couldn't see a dish in that photo. Try a clearer photo of the food, or describe it in words.";
    case 'network': case 'no_server': case 'unauthorized': return err.message;
    default: return err?.message || 'Something interrupted the answer. Try again.';
  }
}
