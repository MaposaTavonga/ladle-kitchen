// The app's state and everything that changes it, in one place.
// Screens read it with useStore() and call the actions below.
//
// It's a tiny store built on React's useSyncExternalStore: `S` holds the
// current state, `set()` changes it and redraws every screen that uses it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Vibration } from 'react-native';
import { AIError, aiMessage, ask, askJSON, type Turn } from './ai';
import { newReq } from './options';
import { chefLead, cleanIdeas, cleanRecipe, FRIDGE_PROMPT, ideasPrompt, kcalPrompt, photoIdeasPrompt, portions, recipePrompt, type Ctx } from './prompts';
import type { ChatTurn, Day, Idea, Job, Mode, Photo, Profile, Recipe, Req, ThemeMode, Timer } from './types';
import { dayKey, num } from './util';

export type State = {
  ready: boolean;
  profile: Profile | null;
  days: Day[];
  themeMode: ThemeMode;
  req: Req | null;
  ideas: Idea[];
  seen: string[]; // meal names already suggested this round
  idea: Idea | null;
  recipe: Recipe | null;
  checked: Record<number, boolean>; // ticked shopping items
  chat: ChatTurn[];
  chatBusy: boolean;
  kitchenTab: 'plan' | 'cook' | 'chef';
  job: Job; // a meal-ideas or recipe request in progress (or its error)
  scanning: boolean; // fridge photo being read
  timer: Timer;
  toastMsg: string | null;
};

let S: State = {
  ready: false, profile: null, days: [], themeMode: 'system',
  req: null, ideas: [], seen: [], idea: null, recipe: null, checked: {},
  chat: [], chatBusy: false, kitchenTab: 'plan',
  job: null, scanning: false, timer: null, toastMsg: null,
};

const listeners = new Set<() => void>();
function set(patch: Partial<State>) {
  S = { ...S, ...patch };
  listeners.forEach(l => l());
  schedulePersist();
}
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** Use in any screen: const { profile, recipe, askChef } = useStore(); */
export function useStore() {
  const state = useSyncExternalStore(subscribe, () => S, () => S);
  return { ...state, ...actions };
}

// ---------------- saving to the phone ----------------
const KEYS = { profile: 'ladle:profile', days: 'ladle:days', theme: 'ladle:theme', session: 'ladle:session' };
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist() {
  if (!S.ready) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(persist, 400);
}
async function persist() {
  try {
    const session = S.recipe
      ? {
          req: S.req ? { ...S.req, photo: null } : null, // photos are big and temporary: don't keep them
          idea: S.idea, recipe: S.recipe, checked: S.checked,
          chat: S.chat.slice(-16).map(t => ({ role: t.role, content: t.content })),
          at: Date.now(),
        }
      : null;
    await AsyncStorage.multiSet([
      [KEYS.profile, JSON.stringify(S.profile)],
      [KEYS.days, JSON.stringify(S.days.slice(0, 60))],
      [KEYS.theme, S.themeMode],
      [KEYS.session, JSON.stringify(session)],
    ]);
  } catch {}
}

async function load() {
  try {
    const rows = Object.fromEntries(await AsyncStorage.multiGet(Object.values(KEYS)));
    const profile = rows[KEYS.profile] ? JSON.parse(rows[KEYS.profile]!) : null;
    const days: Day[] = rows[KEYS.days] ? JSON.parse(rows[KEYS.days]!) : [];
    const theme = (rows[KEYS.theme] as ThemeMode) || 'system';
    const session = rows[KEYS.session] ? JSON.parse(rows[KEYS.session]!) : null;
    const fresh = session && Date.now() - session.at < 3 * 24 * 3600 * 1000; // keep a recipe for 3 days
    S = {
      ...S, profile, days, themeMode: theme,
      ...(fresh ? { req: session.req, idea: session.idea, recipe: session.recipe, checked: session.checked ?? {}, chat: session.chat ?? [] } : {}),
    };
  } catch {}
  set({ ready: true });
}
load();

// ---------------- helpers ----------------
let toastTimer: ReturnType<typeof setTimeout> | null = null;
function toast(msg: string) {
  set({ toastMsg: msg });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => set({ toastMsg: null }), 3200);
}

const today = (): Day => S.days.find(d => d.date === dayKey()) ?? { date: dayKey(), entries: [] };
export const eatenToday = (days: Day[] = S.days) =>
  (days.find(d => d.date === dayKey())?.entries ?? []).reduce((a, e) => a + num(e.kcal), 0);
const recentMeals = () => [...new Set(S.days.flatMap(d => d.entries.map(e => e.name)))].slice(0, 20);

function ctx(): Ctx {
  if (!S.profile || !S.req) throw new AIError('server_error', 'Set up your profile and request first.');
  return { profile: S.profile, req: S.req, eatenToday: eatenToday(), recentMeals: recentMeals() };
}

let jobCtl: AbortController | null = null;
let chatCtl: AbortController | null = null;
let timerHandle: ReturnType<typeof setTimeout> | null = null;

// ---------------- actions ----------------
export const actions = {
  toast,

  saveProfile(p: Profile) { set({ profile: p }); },
  setTheme(m: ThemeMode) { set({ themeMode: m }); },
  setKitchenTab(t: State['kitchenTab']) { set({ kitchenTab: t }); },

  startRequest(mode: Mode) { set({ req: newReq(mode), seen: [], ideas: [], job: null }); },
  updateReq(patch: Partial<Req>) { if (S.req) set({ req: { ...S.req, ...patch } }); },

  /** Ask for 3 meal ideas (from a photo of a dish when there is one). */
  async runIdeas(fresh = true) {
    jobCtl?.abort();
    const ctl = new AbortController(); jobCtl = ctl;
    const req = S.req!;
    const fromPhoto = req.mode === 'dish' && !!req.photo && !req.identified;
    set({ job: { kind: 'ideas', label: fromPhoto ? 'Looking at your photo' : fresh ? 'Finding meals for you' : 'Finding 3 new meals' }, ...(fresh ? { seen: [] } : {}) });
    try {
      let res: any;
      if (fromPhoto) {
        res = await askJSON(photoIdeasPrompt(ctx()), { images: [req.photo!], signal: ctl.signal });
        const id = res?.identified ?? {};
        if (!String(id.dish ?? '').trim()) throw new AIError('no_dish', 'No dish found');
        set({ req: { ...S.req!, identified: { dish: String(id.dish).trim(), description: String(id.description ?? ''), conflicts: String(id.conflicts ?? '') } } });
      } else {
        res = await askJSON(ideasPrompt(ctx(), S.seen), { tier: 'quick', signal: ctl.signal });
      }
      const ideas = cleanIdeas(res);
      if (!ideas.length) throw new AIError('invalid_json', 'No ideas returned');
      set({ ideas, seen: [...S.seen, ...ideas.map(i => i.name)], job: null });
    } catch (e: any) {
      if (e?.code === 'cancelled') { set({ job: null }); return; }
      set({ job: { kind: 'ideas', label: '', error: aiMessage(e) ?? 'Something went wrong.' } });
    }
  },

  /** Write the full recipe for one idea. */
  async runRecipe(idea: Idea) {
    jobCtl?.abort();
    const ctl = new AbortController(); jobCtl = ctl;
    set({ idea, job: { kind: 'recipe', label: `Writing ${idea.name}` } });
    try {
      const res = await askJSON(recipePrompt(ctx(), idea), { signal: ctl.signal });
      const recipe = cleanRecipe(res, portions(S.req!));
      set({ recipe, checked: {}, chat: [], kitchenTab: 'plan', job: null });
    } catch (e: any) {
      if (e?.code === 'cancelled') { set({ job: null }); return; }
      set({ job: { kind: 'recipe', label: '', error: aiMessage(e) ?? 'Something went wrong.' } });
    }
  },

  cancelJob() { jobCtl?.abort(); jobCtl = null; set({ job: null }); },
  clearJobError() { if (S.job?.error) set({ job: null }); },

  toggleCheck(i: number) { set({ checked: { ...S.checked, [i]: !S.checked[i] } }); },

  /** Ask Chef about the current dish, optionally with a photo. */
  async askChef(question: string, photo?: Photo | null) {
    const recipe = S.recipe;
    let q = question.trim();
    if ((!q && !photo) || S.chatBusy || !recipe) return;
    if (!q) q = 'Have a look at my food in this photo. How is it going, and what should I do next?';
    const turns: ChatTurn[] = [...S.chat, { role: 'user', content: q + (photo ? '\n[The cook attached a photo.]' : ''), photoUri: photo?.uri }];
    set({ chat: turns, chatBusy: true, kitchenTab: 'chef' });
    chatCtl = new AbortController();
    const input: Turn[] = [{ role: 'user', content: chefLead(ctx(), recipe) }, ...turns.slice(-12).map(t => ({ role: t.role, content: t.content }))];
    try {
      const { text } = await ask(input, { tier: 'quick', images: photo ? [photo] : undefined, signal: chatCtl.signal });
      set({ chat: [...S.chat, { role: 'assistant', content: text }] });
    } catch (e: any) {
      const m = aiMessage(e);
      if (m) set({ chat: [...S.chat, { role: 'assistant', content: m }] });
    } finally {
      chatCtl = null;
      set({ chatBusy: false });
    }
  },
  stopChat() { chatCtl?.abort(); },

  /** Read the ingredients in a fridge photo and add them to the list. */
  async scanFridge(photo: Photo) {
    if (S.scanning || !S.req) return;
    set({ scanning: true });
    try {
      const res: any = await askJSON(FRIDGE_PROMPT, { images: [photo] });
      const items: string[] = (Array.isArray(res?.items) ? res.items : []).map((x: any) => String(x).trim()).filter(Boolean).slice(0, 25);
      const have = [...(S.req?.have ?? [])];
      items.forEach(x => { if (!have.some(h => h.toLowerCase() === x.toLowerCase())) have.push(x); });
      const added = have.length - (S.req?.have.length ?? 0);
      actions.updateReq({ have });
      toast(added ? `Added ${added} ingredient${added > 1 ? 's' : ''}. Remove anything Chef got wrong.` : "I couldn't spot any ingredients. Try a closer, brighter photo.");
    } catch (e) {
      const m = aiMessage(e); if (m) toast(m);
    } finally {
      set({ scanning: false });
    }
  },

  async estimateKcal(food: string): Promise<{ kcal: number; note: string } | null> {
    try {
      const r: any = await askJSON(kcalPrompt(food), { tier: 'quick' });
      return { kcal: Math.round(num(r?.kcal)), note: String(r?.note ?? '') };
    } catch (e) {
      const m = aiMessage(e); if (m) toast(m);
      return null;
    }
  },

  // ---- calorie tracker ----
  logFood(name: string, kcal: number, macros?: { protein: number; carbs: number; fat: number }) {
    const d = today();
    const entry = { name, kcal: Math.round(kcal), at: Date.now(), ...(macros ? { protein: macros.protein, carbs: macros.carbs, fat: macros.fat } : {}) };
    const updated: Day = { ...d, entries: [...d.entries, entry] };
    set({ days: [updated, ...S.days.filter(x => x.date !== d.date)].sort((a, b) => b.date.localeCompare(a.date)) });
  },
  removeFood(i: number) {
    const d = today();
    const updated: Day = { ...d, entries: d.entries.filter((_, k) => k !== i) };
    set({ days: [updated, ...S.days.filter(x => x.date !== d.date)].sort((a, b) => b.date.localeCompare(a.date)) });
  },
  setTarget(kcal: number | null) { if (S.profile) set({ profile: { ...S.profile, kcal } }); },

  // ---- cooking timer ----
  startTimer(minutes: number, label: string) {
    if (timerHandle) clearTimeout(timerHandle);
    set({ timer: { label, minutes, endsAt: Date.now() + minutes * 60_000 } });
    timerHandle = setTimeout(() => {
      Vibration.vibrate([0, 500, 250, 500, 250, 500]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      toast(`Time's up: ${label}`);
      set({ timer: null });
    }, minutes * 60_000);
  },
  stopTimer() { if (timerHandle) clearTimeout(timerHandle); timerHandle = null; set({ timer: null }); },
};
