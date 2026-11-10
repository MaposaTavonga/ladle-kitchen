// Shared types for the whole app.

export type Mode = 'budget' | 'dish' | 'pantry';
export type ThemeMode = 'system' | 'light' | 'dark';

export type Profile = {
  likes: string[];
  likesOther: string;
  dislikes: string[];
  dislikesOther: string;
  allergies: string[];
  allergiesOther: string;
  diet: string;
  spice: string;
  skill: string;
  equipment: string[];
  store: string;
  kcal: number | null; // optional daily calorie target, set in the tracker
};

/** A photo picked with the camera or gallery. base64 is sent to the AI. */
export type Photo = { uri: string; base64: string; mimeType: string };

export type Identified = { dish: string; description: string; conflicts: string };

/** What the cook asked for on one of the three planning screens. */
export type Req = {
  mode: Mode;
  budget: string; // kept as text because it comes from a TextInput
  people: string;
  moods: string[];
  feeling: string;
  meal: string;
  pantry: string; // free things already at home
  have: string[]; // pantry mode: ingredients the cook has
  want: string; // what they feel like / want to make
  bulk: boolean;
  meals: string; // bulk: how many meals it should last
  photo: Photo | null; // dish mode: photo of the dish
  identified: Identified | null; // what the AI saw in that photo
};

export type Idea = {
  name: string;
  pitch: string;
  estCost: number;
  costPerPortion: number;
  kcalPerServing: number;
  minutes: number;
  keyIngredients: string[];
};

export type Recipe = {
  name: string;
  summary: string;
  servings: number;
  shopping: { item: string; qty: string; price: number }[];
  pantry: string[];
  upgrades: { item: string; price: number; effect: string }[];
  bulk: { storage: string; reheat: string; tip: string } | null;
  ingredients: { name: string; amount: string; role: string }[];
  steps: { text: string; why: string; minutes: number | null }[];
  nutrition: { kcal: number; protein: number; carbs: number; fat: number };
  healthNote: string;
  tweaks: { goal: string; change: string; why: string }[];
};

export type Entry = { name: string; kcal: number; protein?: number; carbs?: number; fat?: number; at: number };
export type Day = { date: string; entries: Entry[] };

export type ChatTurn = { role: 'user' | 'assistant'; content: string; photoUri?: string };

export type Job = { kind: 'ideas' | 'recipe'; label: string; error?: string } | null;

export type Timer = { label: string; endsAt: number; minutes: number } | null;
