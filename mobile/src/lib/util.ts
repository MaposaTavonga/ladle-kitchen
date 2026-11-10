// Small helpers used everywhere.

/** Turn anything ("R45", "12.5", 7) into a number, or the fallback. */
export function num(v: unknown, fallback = 0): number {
  const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : fallback;
}

/** Format rand: R45, R12.50 */
export function R(n: unknown): string {
  const v = Math.round(num(n) * 100) / 100;
  return 'R' + v.toFixed(2).replace(/\.00$/, '');
}

export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Total people × meals when cooking in bulk. */
export function portionsFor(people: string, bulk: boolean, meals: string): number {
  const p = Math.max(1, Math.round(num(people, 1)));
  return p * (bulk ? Math.max(1, Math.round(num(meals, 1))) : 1);
}
