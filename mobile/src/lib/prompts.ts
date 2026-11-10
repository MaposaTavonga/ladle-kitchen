// Everything the AI is told, and the clean-up of what it sends back.
// Change these to change how Ladle plans meals and how Chef talks.
import { ALLERGY_WORDS } from './options';
import type { Idea, Profile, Recipe, Req } from './types';
import { num, portionsFor, R } from './util';

export type Ctx = {
  profile: Profile;
  req: Req;
  eatenToday: number;
  recentMeals: string[];
};

const BASE = `You are the chef and meal planner inside Ladle, a cooking app for South African home cooks that teaches WHY things work in cooking. Use ingredients sold at ordinary South African supermarkets (Shoprite, Checkers, Pick n Pay, Spar, Boxer) and estimate realistic current prices in South African rand. Lean healthy: include vegetables, keep oil and salt sensible, and keep portions reasonable.`;

const list = (a: string[], other: string) =>
  [...a, ...(other ? other.split(',').map(s => s.trim()).filter(Boolean) : [])].join(', ') || 'none given';

export function profileText({ profile: p, eatenToday }: Ctx): string {
  return `COOK'S TASTE PROFILE
- Likes: ${list(p.likes, p.likesOther)}
- Dislikes (do not use): ${list(p.dislikes, p.dislikesOther)}
- Allergies (NEVER include, including hidden sources such as stock powders, sauces, spreads): ${list(p.allergies, p.allergiesOther)}
- Diet: ${p.diet}
- Spice tolerance: ${p.spice}
- Cooking skill: ${p.skill}
- Equipment: ${p.equipment.join(', ') || 'stove'}
- Usually shops at: ${p.store && p.store !== 'Any' ? `${p.store} (estimate prices for this store)` : 'any supermarket'}${p.kcal ? `\n- Daily calorie target ${p.kcal} kcal; eaten so far today ${eatenToday} kcal` : ''}`;
}

export const portions = (r: Req) => portionsFor(r.people, r.bulk, r.meals);

export function requestText({ req: r }: Ctx): string {
  const people = Math.max(1, Math.round(num(r.people, 1)));
  const mood = [...r.moods, r.feeling.trim()].filter(Boolean).join('; ') || 'no particular mood';
  const who = `feeding ${people} ${people > 1 ? 'people' : 'person'}`;
  const bulk = r.bulk
    ? `\nBATCH COOKING: they want to cook in bulk — ${portions(r)} portions in total (${people} × ${r.meals} meals). Choose food that keeps and reheats well, buy bulk pack sizes where that is cheaper per kg, and think about cost per portion.`
    : '';
  const want = r.want.trim()
    ? `What they feel like / want to make: ${r.want.trim()}.`
    : r.mode === 'dish' && r.identified ? '' : 'They have not said what they want — surprise them.';
  const home = r.pantry.trim() ? `Already at home for free: ${r.pantry.trim()}.` : 'Only salt, cooking oil and water are at home for free.';
  const budget = num(r.budget);

  if (r.mode === 'budget') {
    return `REQUEST (cook to a budget): R${budget} in total to spend, ${who}, for ${r.meal.toLowerCase()}. Mood / how they feel: ${mood}. ${want} ${home}${bulk}`;
  }
  if (r.mode === 'dish') {
    const seen = r.identified ? `From the photo they uploaded, the dish is: ${r.identified.dish} — ${r.identified.description}. Recreate this dish. ` : '';
    return `REQUEST (price a dish): ${seen}${want} ${who}, for ${r.meal.toLowerCase()}. Mood: ${mood}. ${budget > 0 ? `They would like to stay under R${budget}.` : 'They have no fixed budget: work out what it will cost them, and keep it good value.'} ${home}${bulk}`;
  }
  return `REQUEST (cook with what they have): The cook already has: ${r.have.join(', ')}. ${want} They can spend up to R${budget} on extra ingredients. ${who}, for ${r.meal.toLowerCase()}. Mood: ${mood}. Salt, oil and water are available.${bulk}`;
}

const IDEA_SHAPE = `{"name": string, "pitch": string (one sentence on why it suits this person today), "estCost": number (rand, total to buy), "costPerPortion": number (rand), "kcalPerServing": number, "minutes": number, "keyIngredients": [string] (up to 6; mark ones to buy with " (buy)")}`;

export function ideasPrompt(ctx: Ctx, seen: string[]): string {
  const r = ctx.req;
  const avoid = [...ctx.recentMeals, ...seen];
  const rule =
    r.mode === 'dish'
      ? 'Give 3 versions of what they asked for at different price points: a cheap version, a standard version and an upgraded version (better cuts or extra ingredients that genuinely improve it). Name each clearly and price each honestly.'
      : r.mode === 'pantry'
        ? 'Use mostly what the cook already has; anything extra must be cheap and fit the extra budget. Make the 3 clearly different (different dish or cooking method).'
        : `Each must fit within R${num(r.budget)}. Make the 3 clearly different from each other (different main ingredient or cooking method). Prefer something the cook may not have tried before.`;
  return `${BASE}

${profileText(ctx)}

${requestText(ctx)}

Suggest 3 meals. Respect every allergy and dislike, and suit the mood. ${rule} Do not suggest any of these: ${avoid.join('; ') || 'none'}.

Reply with only a JSON array of 3 objects, each:
${IDEA_SHAPE}`;
}

export function photoIdeasPrompt(ctx: Ctx): string {
  return `${BASE}

${profileText(ctx)}

${requestText(ctx)}

The attached image is a photo of a dish the cook wants to make at home (from a restaurant, social media or a friend). First, work out what the dish is from what you can see: the main ingredients, the cooking method, any sauce, sides or garnish. ${ctx.req.want.trim() ? 'Use their note above as a hint.' : ''}

Then give 3 ways to recreate it at home at different price points: a cheap version, a standard version that looks closest to the photo, and an upgraded version. Keep the look and flavour of the photo, but respect every allergy and dislike — if the dish contains something they can't eat, swap it and say so in the pitch.

Reply with only one JSON object:
{"identified": {"dish": string (the dish's name, or "" if the image does not show food), "description": string (one sentence on what you see: main ingredients, method, sides), "conflicts": string (allergy or dislike problems in the original dish, or "")},
"ideas": [3 objects, each ${IDEA_SHAPE}]}`;
}

export function recipePrompt(ctx: Ctx, idea: Idea): string {
  const r = ctx.req;
  const money = r.mode === 'dish' && !(num(r.budget) > 0)
    ? 'There is no fixed budget: price everything honestly so the cook knows what it will cost.'
    : `The shopping total must stay within R${num(r.budget)}.`;
  return `${BASE}

${profileText(ctx)}

${requestText(ctx)}

Write the full recipe for "${idea.name}" — ${idea.pitch}

Make ${portions(r)} portions. Teach cause and effect: say what each ingredient does in THIS dish (taste, texture, colour, cost) and why each step is done. Respect every allergy and dislike. ${money} Write steps a ${ctx.profile.skill.toLowerCase()} cook can follow, between 5 and 10 steps.

Reply with only one JSON object:
{"name": string, "summary": string (2 sentences), "servings": number,
"shopping": [{"item": string, "qty": string (the pack size to buy), "price": number}] (only items to buy; prices in rand),
"upgrades": [{"item": string, "price": number, "effect": string (one sentence: what buying this would improve)}] (2 or 3 optional extras worth buying to make the meal better),
"bulk": ${r.bulk ? '{"storage": string (fridge and freezer advice, how many days), "reheat": string, "tip": string (one way to keep the meals from getting boring across the week)}' : 'null'},
"pantry": [string] (items assumed already at home),
"ingredients": [{"name": string, "amount": string, "role": string (one sentence: what it does in this dish)}],
"steps": [{"text": string, "why": string (one sentence: what this step does to the food), "minutes": number or null}],
"nutrition": {"kcal": number, "protein": number, "carbs": number, "fat": number} (per serving; grams),
"healthNote": string (one sentence),
"tweaks": [{"goal": string (2-3 words, e.g. "Make it richer"), "change": string, "why": string}] (exactly 4, covering different goals such as richer, spicier, lighter, cheaper)}`;
}

export function chefLead(ctx: Ctx, recipe: Recipe): string {
  const total = recipe.shopping.reduce((a, x) => a + num(x.price), 0);
  return `${BASE}

You are now "Chef", answering the cook's questions while they cook. Your job is cause and effect: when they ask "if I do X, what happens?" or "what does this do?", say what happens to taste, texture, cost (in rand) and calories, and why. Then give the practical move. 2 to 5 sentences, plain text, no markdown, no bullet lists. Respect their allergies and dislikes in any suggestion. If they ask for a change (spicier, richer, cheaper, lighter), give exact amounts. If they send a photo, describe what you see before advising.

${profileText(ctx)}

${requestText(ctx)}

THE DISH: ${recipe.name} (serves ${recipe.servings}). ${recipe.summary}
Ingredients: ${recipe.ingredients.map(i => `${i.amount} ${i.name}`).join('; ')}
Steps: ${recipe.steps.map((s, k) => `${k + 1}. ${s.text}`).join(' ')}
Per serving: ${recipe.nutrition.kcal} kcal. Shopping total ${R(total)}.`;
}

export const FRIDGE_PROMPT = `The attached photo shows the inside of a fridge, cupboard or kitchen counter in a South African home. List the food ingredients you can clearly see that could be used for cooking. Use short everyday names (e.g. "eggs", "cabbage", "tinned pilchards", "maize meal"). Skip anything you are unsure of, non-food items and empty containers. Reply with only JSON: {"items": [string]}`;

export const kcalPrompt = (food: string) =>
  `Estimate the calories in this food as eaten by one person in South Africa: "${food}". Reply with only JSON: {"kcal": number, "note": string (under 12 words, the portion you assumed)}`;

// ---------- clean up what the AI returns ----------

export function cleanIdeas(v: any): Idea[] {
  const arr = Array.isArray(v) ? v : Array.isArray(v?.ideas) ? v.ideas : [];
  return arr.filter((x: any) => x && x.name).slice(0, 3).map((x: any) => ({
    name: String(x.name),
    pitch: String(x.pitch ?? ''),
    estCost: num(x.estCost),
    costPerPortion: num(x.costPerPortion),
    kcalPerServing: Math.round(num(x.kcalPerServing)),
    minutes: Math.round(num(x.minutes)),
    keyIngredients: (Array.isArray(x.keyIngredients) ? x.keyIngredients : []).map(String).slice(0, 6),
  }));
}

export function cleanRecipe(v: any, fallbackServings: number): Recipe {
  if (!v || !v.name || !Array.isArray(v.steps)) throw Object.assign(new Error('bad recipe'), { code: 'invalid_json' });
  const n = v.nutrition ?? {};
  const arr = (x: any) => (Array.isArray(x) ? x : []);
  return {
    name: String(v.name),
    summary: String(v.summary ?? ''),
    servings: Math.max(1, Math.round(num(v.servings, fallbackServings))),
    shopping: arr(v.shopping).filter((x: any) => x?.item).map((x: any) => ({ item: String(x.item), qty: String(x.qty ?? ''), price: num(x.price) })),
    pantry: arr(v.pantry).map(String),
    upgrades: arr(v.upgrades).filter((x: any) => x?.item).slice(0, 3).map((x: any) => ({ item: String(x.item), price: num(x.price), effect: String(x.effect ?? '') })),
    bulk: v.bulk && typeof v.bulk === 'object' ? { storage: String(v.bulk.storage ?? ''), reheat: String(v.bulk.reheat ?? ''), tip: String(v.bulk.tip ?? '') } : null,
    ingredients: arr(v.ingredients).filter((x: any) => x?.name).map((x: any) => ({ name: String(x.name), amount: String(x.amount ?? ''), role: String(x.role ?? '') })),
    steps: v.steps.filter((x: any) => x?.text).map((x: any) => ({ text: String(x.text), why: String(x.why ?? ''), minutes: x.minutes ? Math.round(num(x.minutes)) : null })),
    nutrition: { kcal: Math.round(num(n.kcal)), protein: Math.round(num(n.protein)), carbs: Math.round(num(n.carbs)), fat: Math.round(num(n.fat)) },
    healthNote: String(v.healthNote ?? ''),
    tweaks: arr(v.tweaks).filter((x: any) => x?.goal).slice(0, 4).map((x: any) => ({ goal: String(x.goal), change: String(x.change ?? ''), why: String(x.why ?? '') })),
  };
}

/** Words in the recipe that match the cook's allergy list. */
export function allergyHits(recipe: Recipe, profile: Profile): string[] {
  const text = ' ' + [...recipe.ingredients.map(i => i.name), ...recipe.shopping.map(s => s.item)].join(' | ').toLowerCase() + ' ';
  const hits: string[] = [];
  for (const a of profile.allergies) {
    for (const w of ALLERGY_WORDS[a] ?? []) {
      if (new RegExp('\\b' + w.replace(/\s+/g, '\\s+') + '\\b').test(text)) { hits.push(`${w} (${a.toLowerCase()})`); break; }
    }
  }
  profile.allergiesOther.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(w => { if (text.includes(w)) hits.push(w); });
  return hits;
}
