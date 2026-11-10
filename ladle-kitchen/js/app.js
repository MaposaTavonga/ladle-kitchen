/* Ladle Kitchen app logic. See README.md for a map of the sections. */
/* ================= icons & helpers ================= */
const ICON = {
  back:'<path d="M15 18l-6-6 6-6"/>',
  wallet:'<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/>',
  basket:'<path d="M5 10h14l-1.5 9h-11z"/><path d="M9 10l3-6 3 6"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flame:'<path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-4-1-7 1-10z"/>',
  hat:'<path d="M6 13.9A4 4 0 0 1 7 6a5 5 0 0 1 10 0 4 4 0 0 1 1 7.9V20H6z"/><path d="M6 17h12"/>',
  send:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  stop:'<rect x="7" y="7" width="10" height="10" rx="1.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
  down:'<path d="M6 9l6 6 6-6"/>',
  alert:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  leaf:'<path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15"/><path d="M5 19l7-7"/>',
  refresh:'<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  camera:'<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  play:'<path d="M7 5l12 7-12 7z"/>'
};
const ico = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v, d=0) => { const n = Number(String(v ?? '').replace(/[^0-9.\-]/g,'')); return Number.isFinite(n) ? n : d; };
const R = (n) => 'R' + (Math.round(num(n)*100)/100).toFixed(2).replace(/\.00$/,'');
const dayKey = (d=new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fmtT = (sec) => { const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), s=sec%60; return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; };
const ls = {
  get(k,d){ try{ const v=localStorage.getItem('ladle2:'+k); return v?JSON.parse(v):d; }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem('ladle2:'+k, JSON.stringify(v)); }catch(e){} }
};
/* theme: system / light / dark — remembered on this device */
let THEME = ls.get('theme', 'system');
function applyTheme(prev){
  const root = document.documentElement;
  if (THEME === 'system'){ if (prev && prev !== 'system') root.removeAttribute('data-theme'); }
  else root.setAttribute('data-theme', THEME);
}
function isDark(){
  const a = document.documentElement.getAttribute('data-theme');
  if (a) return a === 'dark';
  try{ return matchMedia('(prefers-color-scheme: dark)').matches; }catch(e){ return false; }
}
function setTheme(t){ const prev = THEME; THEME = t; ls.set('theme', t); applyTheme(prev); }
applyTheme();

function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>{t.hidden=true},3400); }

/* ================= options ================= */
const OPT = {
  flavours:['Spicy','Savoury','Sweet','Tangy','Smoky','Creamy','Garlicky','Herby'],
  foods:['Chicken','Beef','Mince','Fish','Eggs','Beans & lentils','Gizzards & livers','Pap','Rice','Pasta','Potatoes','Lots of veg'],
  dislikes:['Mushrooms','Onions','Coriander','Seafood','Offal','Very sweet food','Beans','Cabbage','Liver','Fish'],
  allergies:['Peanuts','Tree nuts','Dairy','Eggs','Gluten','Fish','Shellfish','Soy'],
  diets:['No restrictions','Halal','No pork','Vegetarian','Pescatarian'],
  spice:['None','Mild','Medium','Hot','Very hot'],
  skill:['Beginner','Some experience','Confident'],
  equipment:['Stove','Oven','Microwave','Air fryer','Kettle'],
  moods:['Comfort food','Light & fresh','Quick, under 30 min','Something spicy','Filling','Surprise me','Feeling under the weather','After gym'],
  meal:['Breakfast','Lunch','Dinner','Any'],
  stores:['Any','Shoprite','Checkers','Pick n Pay','Spar','Boxer','Woolworths'],
  themes:['System','Light','Dark'],
  pantryQuick:['Maize meal','Rice','Onions','Tomatoes','Eggs','Potatoes','Soup packet','Tinned fish','Chicken pieces','Cabbage','Baked beans','Spinach','Carrots','Stock cubes']
};
const ALLERGY_WORDS = {
  'Peanuts':['peanut','peanuts','peanut butter','groundnut'],
  'Tree nuts':['nuts','almond','almonds','cashew','cashews','walnut','walnuts','pecan','pecans','macadamia','hazelnut','pistachio'],
  'Dairy':['milk','buttermilk','cheese','butter','cream','yoghurt','yogurt','maas','amasi','custard','ghee'],
  'Eggs':['egg','eggs','mayonnaise','mayo'],
  'Gluten':['flour','bread','pasta','spaghetti','macaroni','noodles','wheat','couscous','dumpling','dumplings','vetkoek','breadcrumbs','semolina'],
  'Fish':['fish','pilchard','pilchards','tuna','hake','sardine','sardines','snoek','mackerel','salmon','anchovy'],
  'Shellfish':['prawn','prawns','shrimp','mussel','mussels','crab','calamari','lobster'],
  'Soy':['soy','soya','tofu','edamame']
};

/* ================= storage (per signed-in user) ================= */
const P = {
  db:null, uid:null, me:null,
  async init(){
    const c = window.claude;
    if (!c?.use) return;
    const [u, d] = await Promise.all([c.use('user').catch(()=>null), c.use('db').catch(()=>null)]);
    if (u){ try{ this.me = await u.me(); this.uid = this.me.id; }catch(e){} }
    if (d && this.uid) this.db = d;
  },
  get cloud(){ return !!this.db; },
  ref(){ return this.db.doc('data/users/' + this.uid + '/profile'); },
  async getProfile(){
    if (this.db){ try{ const s = await this.ref().get(); if (s.exists) return structuredClone(s.data().profile || null); return null; }catch(e){} }
    return ls.get('profile', null);
  },
  async saveProfile(p){
    ls.set('profile', p);
    if (this.db){ await this.ref().set({ profile:p, updatedAt:Date.now() }); }
  },
  async getDays(){
    if (this.db){
      try{ const q = await this.ref().collection('days').orderBy('date','desc').limit(14).get(); return q.docs.map(d => structuredClone(d.data())); }catch(e){}
    }
    return Object.values(ls.get('days', {})).sort((a,b) => b.date.localeCompare(a.date)).slice(0,14);
  },
  async saveDay(day){
    const all = ls.get('days', {}); all[day.date] = day; ls.set('days', all);
    if (this.db){ await this.ref().collection('days').doc(day.date).set(day); }
  }
};

/* ================= Claude ================= */
let AI = null, imagesOk = false, imgAccept = 'image/*';
async function initAI(){
  try{ AI = (await window.claude?.use?.('sample')) ?? null; }catch(e){ AI = null; }
  if (AI){ try{ const lim = await AI.limits(); if (lim?.images){ imagesOk = true; imgAccept = lim.images.mediaTypes.join(','); } }catch(e){} }
}
/* keep the current recipe if the page reloads (this device only) */
async function scanFridge(file){
  if (!AI || S.scanning) return;
  S.scanning = true; render();
  try{
    const res = await AI.json(`The attached photo shows the inside of a fridge, cupboard or kitchen counter in a South African home. List the food ingredients you can clearly see that could be used for cooking. Use short everyday names (e.g. "eggs", "cabbage", "tinned pilchards", "maize meal"). Skip anything you are unsure of, non-food items and empty containers. Reply with only JSON: {"items": [string]}`, { images:file, cache:false });
    const items = (Array.isArray(res?.items) ? res.items : []).map(x => String(x).trim()).filter(Boolean).slice(0,25);
    const before = S.req.have.length;
    items.forEach(x => { if (!S.req.have.some(h => h.toLowerCase() === x.toLowerCase())) S.req.have.push(x); });
    const added = S.req.have.length - before;
    toast(added ? `Added ${added} ingredient${added>1?'s':''}. Remove anything Chef got wrong.` : "I couldn't spot any ingredients. Try a closer, brighter photo.");
  }catch(e){ const m = aiErr(e); if (m) toast(m); }
  finally{ S.scanning = false; if (S.view === 'pantry') render(); }
}
function saveSession(){ if (S.recipe) ls.set('session', { req:{ ...S.req, photo:null }, idea:S.idea, recipe:S.recipe, checked:S.checked, turns:S.chat.turns.filter(t=>!t.photoUrl).slice(-12), at:Date.now() }); }
function loadSession(){
  const s = ls.get('session', null);
  if (!s || !s.recipe || Date.now() - s.at > 3*24*3600*1000) return;
  S.req = s.req; S.idea = s.idea; S.recipe = s.recipe; S.checked = s.checked || {};
  S.chat.turns = s.turns || [];
}
async function copyList(){
  const r = S.recipe, total = r.shopping.reduce((a,x)=>a+num(x.price),0);
  const text = `Shopping list: ${r.name}\n` + r.shopping.map(s => `- ${s.item}${s.qty?` (${s.qty})`:''}: ${R(s.price)}`).join('\n') + `\nTotal: about ${R(total)}`;
  try{ await navigator.clipboard.writeText(text); toast('Shopping list copied. Paste it into WhatsApp or your notes.'); S.copyText = null; }
  catch(e){ S.copyText = text; render(); const t = document.getElementById('copytext'); t?.focus(); t?.select(); toast('Select the text below and copy it.'); }
}
function aiErr(e){
  const c = e?.code;
  if (c==='cancelled') return null;
  if (c==='not_granted' || c==='sampling_disabled') return 'Ladle needs your permission to use Claude. Allow it when asked, or reload the page to be asked again.';
  if (c==='rate_limited') return 'Too many requests right now. Wait a minute, then try again.';
  if (c==='invalid_json') return "The answer came back in the wrong shape. Tap try again.";
  if (c==='refused') return "Claude wouldn't answer that one. Try asking a different way.";
  if (c==='no_dish') return "I couldn't see a dish in that photo. Try a clearer photo of the food, or describe it in words.";
  if (c==='image_rejected' || c==='images_unavailable') return "That photo couldn't be opened. Try a JPG or PNG straight from your camera.";
  return 'Something interrupted the answer. Try again.';
}

/* ================= state ================= */
const S = {
  view:'boot', profile:null, draft:null, days:[],
  req:null, ideas:[], seen:[], idea:null, recipe:null,
  tab:'plan', checked:{}, openIng:null,
  chat:{ turns:[], busy:false, ctl:null },
  job:null, error:null, saving:false,
  add:{ name:'', kcal:'' }, estimating:false,
  focus:null, photo:null, copyText:null,
  timer:{ label:'', total:0, remaining:0, running:false, iv:null }
};
const app = document.getElementById('app');
const today = () => S.days.find(d => d.date === dayKey()) || { date: dayKey(), entries: [] };
const eatenToday = () => today().entries.reduce((a,e) => a + num(e.kcal), 0);
const target = () => (S.profile?.kcal ? num(S.profile.kcal) : null);
const recentMeals = () => [...new Set(S.days.flatMap(d => d.entries.map(e => e.name)))].slice(0,20);

function newDraft(p){
  p = p || {};
  return { likes:[...(p.likes||[])], likesOther:p.likesOther||'', dislikes:[...(p.dislikes||[])], dislikesOther:p.dislikesOther||'',
    allergies:[...(p.allergies||[])], allergiesOther:p.allergiesOther||'', diet:p.diet||'No restrictions', spice:p.spice||'Medium',
    skill:p.skill||'Some experience', equipment:[...(p.equipment||['Stove'])], store:p.store||'Any', kcal:p.kcal||null };
}
function newReq(mode){
  return { mode, budget: mode==='budget'?80:(mode==='pantry'?30:''), people:1, moods:[], feeling:'', meal:'Dinner', pantry:'', have:[], haveInput:'', want:'', bulk:false, meals:5 };
}
const portions = () => S.req.people * (S.req.bulk ? Math.max(1, num(S.req.meals,1)) : 1);
const hasBudget = () => S.req.mode !== 'dish' || num(S.req.budget) > 0;

/* ================= prompts ================= */
function profileText(){
  const p = S.profile;
  const list = (a, o) => [...a, ...(o ? o.split(',').map(s=>s.trim()).filter(Boolean) : [])].join(', ') || 'none given';
  return `COOK'S TASTE PROFILE
- Likes: ${list(p.likes, p.likesOther)}
- Dislikes (do not use): ${list(p.dislikes, p.dislikesOther)}
- Allergies (NEVER include, including hidden sources such as stock powders, sauces, spreads): ${list(p.allergies, p.allergiesOther)}
- Diet: ${p.diet}
- Spice tolerance: ${p.spice}
- Cooking skill: ${p.skill}
- Equipment: ${p.equipment.join(', ') || 'stove'}
- Usually shops at: ${p.store && p.store!=='Any' ? p.store + ' (estimate prices for this store)' : 'any supermarket'}${target() ? `\n- Daily calorie target ${target()} kcal; eaten so far today ${eatenToday()} kcal` : ''}`;
}
function requestText(){
  const r = S.req;
  const mood = [...r.moods, r.feeling.trim()].filter(Boolean).join('; ') || 'no particular mood';
  const who = `feeding ${r.people} ${r.people>1?'people':'person'}`;
  const bulk = r.bulk ? `\nBATCH COOKING: they want to cook in bulk — ${portions()} portions in total (${r.people} ${r.people>1?'people':'person'} × ${r.meals} meals). Choose food that keeps and reheats well, buy bulk pack sizes where that is cheaper per kg, and think about cost per portion.` : '';
  const want = r.want.trim() ? `What they feel like / want to make: ${r.want.trim()}.` : (r.mode==='dish' && r.identified ? '' : 'They have not said what they want — surprise them.');
  const home = r.pantry.trim() ? `Already at home for free: ${r.pantry.trim()}.` : 'Only salt, cooking oil and water are at home for free.';
  if (r.mode === 'budget'){
    return `REQUEST (cook to a budget): R${num(r.budget)} in total to spend, ${who}, for ${r.meal.toLowerCase()}. Mood / how they feel: ${mood}. ${want} ${home}${bulk}`;
  }
  if (r.mode === 'dish'){
    const seen = r.identified ? `From the photo they uploaded, the dish is: ${r.identified.dish} — ${r.identified.description}. Recreate this dish. ` : '';
    return `REQUEST (price a dish): ${seen}${want} ${who}, for ${r.meal.toLowerCase()}. Mood: ${mood}. ${num(r.budget)>0 ? `They would like to stay under R${num(r.budget)}.` : 'They have no fixed budget: work out what it will cost them, and keep it good value.'} ${home}${bulk}`;
  }
  return `REQUEST (cook with what they have): The cook already has: ${r.have.join(', ')}. ${want} They can spend up to R${num(r.budget)} on extra ingredients. ${who}, for ${r.meal.toLowerCase()}. Mood: ${mood}. Salt, oil and water are available.${bulk}`;
}
const BASE = `You are the chef and meal planner inside Ladle, a cooking app for South African home cooks that teaches WHY things work in cooking. Use ingredients sold at ordinary South African supermarkets (Shoprite, Checkers, Pick n Pay, Spar, Boxer) and estimate realistic current prices in South African rand. Lean healthy: include vegetables, keep oil and salt sensible, and keep portions reasonable.`;

function ideasPrompt(){
  const avoid = [...recentMeals(), ...S.seen];
  const r = S.req;
  const modeRule = r.mode==='dish'
    ? `Give 3 versions of what they asked for at different price points: a cheap version, a standard version and an upgraded version (better cuts or extra ingredients that genuinely improve it). Name each clearly and price each honestly.`
    : r.mode==='pantry'
    ? `Use mostly what the cook already has; anything extra must be cheap and fit the extra budget. Make the 3 clearly different (different dish or cooking method).`
    : `Each must fit within R${num(r.budget)}. Make the 3 clearly different from each other (different main ingredient or cooking method). Prefer something the cook may not have tried before.`;
  return `${BASE}

${profileText()}

${requestText()}

Suggest 3 meals. Respect every allergy and dislike, and suit the mood. ${modeRule} Do not suggest any of these: ${avoid.join('; ') || 'none'}.

Reply with only a JSON array of 3 objects, each:
${IDEA_SHAPE}`;
}
const IDEA_SHAPE = `{"name": string, "pitch": string (one sentence on why it suits this person today), "estCost": number (rand, total to buy), "costPerPortion": number (rand), "kcalPerServing": number, "minutes": number, "keyIngredients": [string] (up to 6; mark ones to buy with " (buy)")}`;
function photoIdeasPrompt(){
  const r = S.req;
  return `${BASE}

${profileText()}

${requestText()}

The attached image is a photo of a dish the cook wants to make at home (from a restaurant, social media or a friend). First, work out what the dish is from what you can see: the main ingredients, the cooking method, any sauce, sides or garnish. ${r.want.trim() ? 'Use their note above as a hint.' : ''}

Then give 3 ways to recreate it at home at different price points: a cheap version, a standard version that looks closest to the photo, and an upgraded version. Keep the look and flavour of the photo, but respect every allergy and dislike — if the dish contains something they can't eat, swap it and say so in the pitch.

Reply with only one JSON object:
{"identified": {"dish": string (the dish's name, or "" if the image does not show food), "description": string (one sentence on what you see: main ingredients, method, sides), "conflicts": string (allergy or dislike problems in the original dish, or "")},
"ideas": [3 objects, each ${IDEA_SHAPE}]}`;
}
function recipePrompt(idea){
  const r = S.req;
  const money = r.mode==='dish' && !(num(r.budget)>0)
    ? 'There is no fixed budget: price everything honestly so the cook knows what it will cost.'
    : `The shopping total must stay within R${num(r.budget)}.`;
  return `${BASE}

${profileText()}

${requestText()}

Write the full recipe for "${idea.name}" — ${idea.pitch}

Make ${portions()} portions. Teach cause and effect: say what each ingredient does in THIS dish (taste, texture, colour, cost) and why each step is done. Respect every allergy and dislike. ${money} Write steps a ${S.profile.skill.toLowerCase()} cook can follow, between 5 and 10 steps.

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
function chefLead(){
  const r = S.recipe;
  return `${BASE}

You are now "Chef", answering the cook's questions while they cook. Your job is cause and effect: when they ask "if I do X, what happens?" or "what does this do?", say what happens to taste, texture, cost (in rand) and calories, and why. Then give the practical move. 2 to 5 sentences, plain text, no markdown, no bullet lists. Respect their allergies and dislikes in any suggestion. If they ask for a change (spicier, richer, cheaper, lighter), give exact amounts.

${profileText()}

${requestText()}

THE DISH: ${r.name} (serves ${r.servings}). ${r.summary}
Ingredients: ${r.ingredients.map(i => `${i.amount} ${i.name}`).join('; ')}
Steps: ${r.steps.map((s,k) => `${k+1}. ${s.text}`).join(' ')}
Per serving: ${r.nutrition.kcal} kcal. Shopping total ${R(r.shopping.reduce((a,x)=>a+num(x.price),0))}.`;
}

/* ================= normalisers ================= */
function cleanIdeas(v){
  const arr = Array.isArray(v) ? v : (Array.isArray(v?.ideas) ? v.ideas : []);
  return arr.filter(x => x && x.name).slice(0,3).map(x => ({
    name:String(x.name), pitch:String(x.pitch||''), estCost:num(x.estCost), kcalPerServing:Math.round(num(x.kcalPerServing)),
    costPerPortion:num(x.costPerPortion), minutes:Math.round(num(x.minutes)), keyIngredients:(Array.isArray(x.keyIngredients)?x.keyIngredients:[]).map(String).slice(0,6)
  }));
}
function cleanRecipe(v){
  if (!v || !v.name || !Array.isArray(v.steps)) throw { code:'invalid_json' };
  const n = v.nutrition || {};
  return {
    name:String(v.name), summary:String(v.summary||''), servings:Math.max(1,Math.round(num(v.servings,portions()))),
    shopping:(v.shopping||[]).filter(x=>x&&x.item).map(x=>({item:String(x.item),qty:String(x.qty||''),price:num(x.price)})),
    pantry:(v.pantry||[]).map(String),
    upgrades:(v.upgrades||[]).filter(x=>x&&x.item).slice(0,3).map(x=>({item:String(x.item),price:num(x.price),effect:String(x.effect||'')})),
    bulk: v.bulk && typeof v.bulk==='object' ? {storage:String(v.bulk.storage||''),reheat:String(v.bulk.reheat||''),tip:String(v.bulk.tip||'')} : null,
    ingredients:(v.ingredients||[]).filter(x=>x&&x.name).map(x=>({name:String(x.name),amount:String(x.amount||''),role:String(x.role||'')})),
    steps:v.steps.filter(x=>x&&x.text).map(x=>({text:String(x.text),why:String(x.why||''),minutes:x.minutes?Math.round(num(x.minutes)):null})),
    nutrition:{kcal:Math.round(num(n.kcal)),protein:Math.round(num(n.protein)),carbs:Math.round(num(n.carbs)),fat:Math.round(num(n.fat))},
    healthNote:String(v.healthNote||''),
    tweaks:(v.tweaks||[]).filter(x=>x&&x.goal).slice(0,4).map(x=>({goal:String(x.goal),change:String(x.change||''),why:String(x.why||'')}))
  };
}
function allergyHits(r){
  const p = S.profile; if (!p) return [];
  const text = ' ' + [...r.ingredients.map(i=>i.name), ...r.shopping.map(s=>s.item)].join(' | ').toLowerCase() + ' ';
  const hits = [];
  for (const a of p.allergies){
    for (const w of ALLERGY_WORDS[a] || []){
      if (new RegExp('\\b' + w.replace(/\s+/g,'\\s+') + '\\b').test(text)){ hits.push(`${w} (${a.toLowerCase()})`); break; }
    }
  }
  (p.allergiesOther||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean).forEach(w => { if (text.includes(w)) hits.push(w); });
  return hits;
}

/* ================= jobs (AI calls) ================= */
async function runJob(kind, label){
  const ctl = new AbortController();
  S.job = { kind, label, ctl }; S.error = null; S.view = 'loading'; render();
  try{
    if (!AI) throw { code:'not_available' };
    if (kind === 'ideas'){
      const r = S.req, fromPhoto = r.mode==='dish' && r.photo && !r.identified;
      const res = fromPhoto
        ? await AI.json(photoIdeasPrompt(), { signal:ctl.signal, cache:false, images:r.photo.file })
        : await AI.json(ideasPrompt(), { modelTier:'quick', signal:ctl.signal, cache:false });
      if (fromPhoto){
        const id = res?.identified || {};
        if (!String(id.dish||'').trim()) throw { code:'no_dish' };
        r.identified = { dish:String(id.dish).trim(), description:String(id.description||''), conflicts:String(id.conflicts||'') };
      }
      const ideas = cleanIdeas(res);
      if (!ideas.length) throw { code:'invalid_json' };
      S.ideas = ideas; S.seen.push(...ideas.map(i=>i.name));
      S.job = null; go('ideas');
    } else {
      const res = await AI.json(recipePrompt(S.idea), { signal:ctl.signal, cache:false });
      S.recipe = cleanRecipe(res);
      S.tab = 'plan'; S.checked = {}; S.openIng = null; S.focus = null; S.copyText = null; S.chat = { turns:[], busy:false, ctl:null };
      S.job = null; saveSession(); go('kitchen');
    }
  }catch(e){
    S.job = null;
    if (e?.code === 'cancelled'){ go(kind==='ideas' ? S.req.mode : 'ideas'); return; }
    S.error = { kind, msg: e?.code==='not_available' ? 'Ladle needs the AI to plan meals. Start the local server (see README) or open Ladle inside Claude.' : aiErr(e) };
    render();
  }
}

async function askChef(q){
  q = String(q||'').trim();
  const c = S.chat, photo = S.photo;
  if ((!q && !photo) || c.busy || !AI) return;
  if (!q) q = 'Have a look at my food in this photo. How is it going, and what should I do next?';
  c.turns.push({ role:'user', content: q + (photo ? '\n[The cook attached a photo.]' : ''), photoUrl: photo?.url });
  S.photo = null;
  c.busy = true; c.ctl = new AbortController();
  S.tab = 'chef'; render(); scrollChat();
  const input = [{ role:'user', content: chefLead() }, ...c.turns.slice(-12).map(t => ({ role:t.role, content:t.content }))];
  try{
    const opts = { modelTier:'quick', cache:false, signal:c.ctl.signal,
      onText: ({ text }) => { const b=document.getElementById('live'); if (b){ b.classList.remove('thinking'); b.textContent=text; scrollChat(); } } };
    if (photo) opts.images = photo.file;
    const { text } = await AI(input, opts);
    c.turns.push({ role:'assistant', content:text });
    saveSession();
  }catch(e){
    const m = aiErr(e);
    if (e?.text) c.turns.push({ role:'assistant', content: e.text + (m ? '\n\n(' + m + ')' : ' …') });
    else if (m) c.turns.push({ role:'assistant', content:m });
  }finally{
    c.busy = false; c.ctl = null;
    if (S.view === 'kitchen'){ render(); scrollChat(); }
  }
}
function scrollChat(){ const m = document.querySelector('main'); if (m && S.tab==='chef') m.scrollTop = m.scrollHeight; }

async function estimateKcal(){
  const name = S.add.name.trim(); if (!name || !AI || S.estimating) return;
  S.estimating = true; render();
  try{
    const r = await AI.json(`Estimate the calories in this food as eaten by one person in South Africa: "${name}". Reply with only JSON: {"kcal": number, "note": string (under 12 words, the portion you assumed)}`, { modelTier:'quick' });
    S.add.kcal = String(Math.round(num(r?.kcal)));
    toast(r?.note ? `Estimated for ${r.note}` : 'Estimated. Adjust if needed.');
  }catch(e){ const m = aiErr(e); if (m) toast(m); }
  finally{ S.estimating = false; render(); }
}

/* ================= calorie log ================= */
async function logFood(name, kcal, macros){
  const d = structuredClone(today());
  const e = { name, kcal:Math.round(num(kcal)), at:Date.now() };
  if (macros){ e.protein = Math.round(num(macros.protein)); e.carbs = Math.round(num(macros.carbs)); e.fat = Math.round(num(macros.fat)); }
  d.entries.push(e);
  upsertDay(d);
  try{ await P.saveDay(d); }catch(e){ toast("Couldn't save to your account. It's kept on this device."); }
}
async function removeFood(i){
  const d = structuredClone(today());
  d.entries.splice(i,1);
  upsertDay(d);
  try{ await P.saveDay(d); }catch(e){}
}
function upsertDay(d){ S.days = [d, ...S.days.filter(x => x.date !== d.date)].sort((a,b)=>b.date.localeCompare(a.date)); }

/* ================= timer ================= */
let audioCtx = null;
function beep(){ if (!audioCtx) return; [0,.35,.7].forEach(t=>{ const o=audioCtx.createOscillator(), g=audioCtx.createGain(); o.frequency.value=880; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(.0001,audioCtx.currentTime+t); g.gain.exponentialRampToValueAtTime(.25,audioCtx.currentTime+t+.02); g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+t+.25); o.start(audioCtx.currentTime+t); o.stop(audioCtx.currentTime+t+.3); }); }
function startTimer(min, label){
  try{ audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)(); audioCtx.resume?.(); }catch(e){}
  const t = S.timer; clearInterval(t.iv);
  Object.assign(t, { label, total:min*60, remaining:min*60, running:true });
  t.iv = setInterval(() => {
    t.remaining = Math.max(0, t.remaining-1);
    if (t.remaining === 0){ clearInterval(t.iv); t.running=false; beep(); toast(`Time's up: ${t.label}`); render(); return; }
    const el = document.getElementById('tclock'); if (el) el.textContent = fmtT(t.remaining);
  }, 1000);
  try{ navigator.wakeLock?.request('screen').catch(()=>{}); }catch(e){}
  render();
}
function stopTimer(){ clearInterval(S.timer.iv); S.timer.running=false; render(); }
const timerBanner = () => S.timer.running ? `<div class="banner">${ico('clock')}<span class="grow">${esc(S.timer.label)}</span><strong id="tclock">${fmtT(S.timer.remaining)}</strong><button data-act="tstop">Stop</button></div>` : '';

/* ================= view pieces ================= */
const chips = (path, options, selected, multi=true) => `<div class="wrap">${options.map(o => {
  const on = multi ? selected.includes(o) : selected === o;
  return `<button type="button" class="chip" data-act="${multi?'toggle':'pick'}" data-path="${path}" data-v="${esc(o)}" aria-pressed="${on}">${esc(o)}</button>`; }).join('')}</div>`;

function headerMain(){
  return `<header class="bar pad">
    <div class="title"><div class="wordmark">Ladle<span>.</span></div></div>
    <button class="iconbtn" data-act="flip" aria-label="${isDark()?'Switch to light mode':'Switch to dark mode'}">${ico(isDark()?'sun':'moon')}</button>
    <button class="iconbtn" data-act="go" data-v="tracker" aria-label="Calorie tracker">${ico('chart')}</button>
    <button class="iconbtn" data-act="go" data-v="profile" aria-label="Your taste profile">${ico('user')}</button>
  </header>`;
}
function headerBack(title, sub, to){
  return `<header class="bar pad">
    <button class="iconbtn" data-act="go" data-v="${to}" aria-label="Back">${ico('back')}</button>
    <div class="title"><strong>${esc(title)}</strong>${sub?`<span>${esc(sub)}</span>`:''}</div>
  </header>`;
}

/* ---------- boot ---------- */
function bootView(){ return `<main><div class="loading pad">${potSvg()}<p class="muted">Opening your kitchen…</p></div></main>`; }
function potSvg(){ return `<svg class="pot" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"><path class="steam" d="M24 14c-3 3 3 5 0 8"/><path class="steam" d="M32 10c-3 3 3 5 0 8"/><path class="steam" d="M40 14c-3 3 3 5 0 8"/><path d="M10 30h44M14 30v18a6 6 0 0 0 6 6h24a6 6 0 0 0 6-6V30M6 34h8M50 34h8" stroke="var(--fg)"/></svg>`; }

/* ---------- profile / onboarding ---------- */
function profileView(first){
  const d = S.draft;
  const who = P.me?.name ? P.me.name.split(' ')[0] : '';
  return `${first ? `<header class="bar pad"><div class="title"><div class="wordmark">Ladle<span>.</span></div></div></header>` : headerBack('Your taste profile','Ladle plans every meal around this','home')}
  <main><form class="inner pad" id="profileform">
    ${first ? `<div style="display:flex;flex-direction:column;gap:8px"><h1>${who?`Hi ${esc(who)}. `:''}Let's learn how you eat.</h1><p class="muted">Ladle builds a new meal for you every time, so it needs to know what you love and what to avoid. Takes a minute.</p></div>` : ''}
    <div class="field"><span class="lbl">Flavours you love</span>${chips('draft.likes', OPT.flavours, d.likes)}</div>
    <div class="field"><span class="lbl">Foods you enjoy</span>${chips('draft.likes', OPT.foods, d.likes)}
      <label for="likesOther" class="sr">Other foods you enjoy</label><input id="likesOther" type="text" data-bind="draft.likesOther" value="${esc(d.likesOther)}" placeholder="Anything else? e.g. chakalaka, curry, peanut butter"></div>
    <div class="field"><span class="lbl">Dislikes</span><span class="hint">Ladle won't cook with these.</span>${chips('draft.dislikes', OPT.dislikes, d.dislikes)}
      <label for="dislikesOther" class="sr">Other dislikes</label><input id="dislikesOther" type="text" data-bind="draft.dislikesOther" value="${esc(d.dislikesOther)}" placeholder="Other dislikes, separated by commas"></div>
    <div class="field"><span class="lbl">Allergies</span><span class="hint">These are never used, including hidden sources like stock powders.</span>${chips('draft.allergies', OPT.allergies, d.allergies)}
      <label for="allergiesOther" class="sr">Other allergies</label><input id="allergiesOther" type="text" data-bind="draft.allergiesOther" value="${esc(d.allergiesOther)}" placeholder="Other allergies, separated by commas"></div>
    <div class="field"><span class="lbl">Diet</span>${chips('draft.diet', OPT.diets, d.diet, false)}</div>
    <div class="field"><span class="lbl">How much chilli can you take?</span>${chips('draft.spice', OPT.spice, d.spice, false)}</div>
    <div class="field"><span class="lbl">Cooking experience</span>${chips('draft.skill', OPT.skill, d.skill, false)}</div>
    <div class="field"><span class="lbl">What you cook with</span>${chips('draft.equipment', OPT.equipment, d.equipment)}</div>
    <div class="field"><span class="lbl">Where you usually shop</span><span class="hint">Prices are estimated for this store.</span>${chips('draft.store', OPT.stores, d.store, false)}</div>
    <div class="field"><span class="lbl">Appearance</span><div class="wrap">${OPT.themes.map(o=>`<button type="button" class="chip" data-act="theme" data-v="${o.toLowerCase()}" aria-pressed="${THEME===o.toLowerCase()}">${o}</button>`).join('')}</div></div>
    <button type="submit" class="btn primary" ${S.saving?'disabled':''}>${first?'Start cooking':'Save profile'}</button>
    <p class="small muted">${P.cloud ? 'Saved privately to your account. Only you can see it.' : 'Saved on this device.'}</p>
  </form></main>`;
}

/* ---------- home ---------- */
function homeView(){
  const eaten = eatenToday(), t = target();
  const who = P.me?.name ? P.me.name.split(' ')[0] : '';
  const last = today().entries.slice(-3).reverse();
  const entry = (mode, icon, title, desc) => `<button data-act="start" data-v="${mode}"><span class="ic">${ico(icon)}</span><span class="tx"><strong>${title}</strong><span class="d">${desc}</span></span>${ico('chev')}</button>`;
  return `${headerMain()}
  <main><div class="inner pad">
    ${timerBanner()}
    <div style="display:flex;flex-direction:column;gap:6px">
      <h1>${who?`What are we cooking, ${esc(who)}?`:'What are we cooking?'}</h1>
      <p class="muted">Something new every time, built around your tastes and your pocket.</p>
    </div>
    <div class="entry">
      ${entry('budget','wallet','I have a budget','Tell me your rand and your mood. I plan the meal and the shopping.')}
      ${entry('dish','hat','I want to make something','Describe it or upload a photo. I tell you what to buy and what it will cost.')}
      ${entry('pantry','basket','I have ingredients','Tell me what is in the kitchen. We work out what to make.')}
    </div>
    <button class="surface" data-act="go" data-v="tracker" style="border:0;text-align:left;cursor:pointer;font:inherit;color:inherit">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
        <span class="eyebrow">Calories today</span>
        ${t ? `<span class="small muted tnum">${t-eaten>=0?`${t-eaten} kcal left`:`${eaten-t} kcal over`}</span>` : `<span class="small muted">Open tracker</span>`}
      </div>
      <div style="display:flex;align-items:baseline;gap:6px"><span class="bignum">${eaten}</span><span class="muted tnum">${t?`/ ${t} kcal`:'kcal'}</span></div>
      ${t ? `<div class="meter ${eaten>t?'over':''}"><i style="width:${Math.min(100,eaten/t*100)}%"></i></div>` : ''}
      ${last.length ? `<span class="small muted">Latest: ${last.map(e=>esc(e.name)).join(', ')}</span>` : `<span class="small muted">Nothing logged yet today.</span>`}
    </button>
    ${S.recipe ? `<button class="btn" data-act="go" data-v="kitchen">${ico('hat')}Back to ${esc(S.recipe.name)}</button>` : ''}
  </div></main>`;
}

/* ---------- request forms ---------- */
function portionsText(){ const r = S.req, p = Math.max(1, Math.round(num(r.people,1))); return `That's ${p * Math.max(1, Math.round(num(r.meals,1)))} portions in total for ${p} ${p>1?'people':'person'}.`; }
function bulkBlock(){
  const r = S.req;
  return `<div class="field">
    <button type="button" class="toggle" role="switch" aria-checked="${r.bulk}" data-act="bulk"><span class="tx"><strong>Cook in bulk</strong><span>Cook once, eat for days. Buys bigger packs when they're cheaper per kg.</span></span><span class="sw" aria-hidden="true"></span></button>
    ${r.bulk ? `<label for="meals">How many meals should it last?</label><input id="meals" type="number" inputmode="numeric" min="2" max="14" data-bind="req.meals" value="${esc(r.meals)}"><span class="hint" style="margin-top:0" id="portions">${portionsText()}</span>` : ''}
  </div>`;
}
function budgetView(){
  const r = S.req;
  return `${headerBack('Cook to a budget','A new meal planned around your rand','home')}
  <main><form class="inner pad" id="reqform">
    <div class="row2">
      <div class="field"><label for="budget">Budget (R)</label><input id="budget" type="number" inputmode="decimal" min="10" step="5" data-bind="req.budget" value="${esc(r.budget)}"></div>
      <div class="field"><label for="people">People</label><input id="people" type="number" inputmode="numeric" min="1" max="12" data-bind="req.people" value="${esc(r.people)}"></div>
    </div>
    <div class="field"><span class="lbl">Which meal?</span>${chips('req.meal', OPT.meal, r.meal, false)}</div>
    <div class="field"><span class="lbl">How are you feeling?</span>${chips('req.moods', OPT.moods, r.moods)}
      <label for="feeling" class="sr">Describe how you feel</label><input id="feeling" type="text" data-bind="req.feeling" value="${esc(r.feeling)}" placeholder="In your words, e.g. tired, want something warm"></div>
    <div class="field"><label for="want">What do you feel like eating? (optional)</label><span class="hint">Leave it blank and Ladle will surprise you.</span>
      <input id="want" type="text" data-bind="req.want" value="${esc(r.want)}" placeholder="e.g. something with pap, a saucy stew"></div>
    <div class="field"><label for="pantry">Already at home (optional)</label><span class="hint">Free stuff Ladle can use, so your budget goes further.</span>
      <input id="pantry" type="text" data-bind="req.pantry" value="${esc(r.pantry)}" placeholder="e.g. rice, curry powder, an onion"></div>
    ${bulkBlock()}
    ${AI ? '' : `<div class="warn">${ico('alert')}<span>Meal planning needs the AI. Start the local server (see README) or open Ladle inside Claude.</span></div>`}
    <button type="submit" class="btn primary" ${AI?'':'disabled'}>Show me 3 meals</button>
  </form></main>`;
}
function dishView(){
  const r = S.req;
  const photo = imagesOk
    ? (r.photo
      ? `<div class="photo-pick"><img src="${r.photo.url}" alt="The dish you want to make"><div class="tx"><strong>Photo added</strong><span>Chef will work out what the dish is and how to make it at home.</span></div><button type="button" class="chip" data-act="rmdishphoto">Remove</button></div>`
      : `<label class="photo-drop" for="dishphoto">${ico('camera')}<span class="tx"><strong>Upload a photo of the dish</strong><span>From a restaurant, TikTok, Instagram or a friend's plate.</span></span></label>
         <input id="dishphoto" type="file" accept="${esc(imgAccept)}" class="sr">`)
    : `<p class="small muted">Photo upload needs the AI. Start the local server (see README).</p>`;
  return `${headerBack('Price a meal','Describe it or show me a photo','home')}
  <main><form class="inner pad" id="reqform">
    <div class="field"><span class="lbl">Seen something you want to cook?</span>${photo}</div>
    <div class="field"><label for="want">${r.photo ? 'Anything to add? (optional)' : 'Or describe what you want to make'}</label><span class="hint">${r.photo ? 'e.g. "without the mushrooms" or "make it spicier".' : 'Be as loose or as exact as you like.'}</span>
      <textarea id="want" data-bind="req.want" placeholder="${r.photo ? 'e.g. I think it is a chicken stir-fry' : 'e.g. chicken curry with rice, or gizzards with pap and tomato gravy'}">${esc(r.want)}</textarea></div>
    <div class="row2">
      <div class="field"><label for="people">People</label><input id="people" type="number" inputmode="numeric" min="1" max="12" data-bind="req.people" value="${esc(r.people)}"></div>
      <div class="field"><label for="budget">Max spend (optional)</label><input id="budget" type="number" inputmode="decimal" min="0" step="5" data-bind="req.budget" value="${esc(r.budget)}" placeholder="No limit"></div>
    </div>
    <div class="field"><span class="lbl">Which meal?</span>${chips('req.meal', OPT.meal, r.meal, false)}</div>
    <div class="field"><label for="pantry">Already at home (optional)</label><span class="hint">So you only pay for what you're missing.</span>
      <input id="pantry" type="text" data-bind="req.pantry" value="${esc(r.pantry)}" placeholder="e.g. rice, onions, curry powder"></div>
    ${bulkBlock()}
    ${AI ? '' : `<div class="warn">${ico('alert')}<span>Meal planning needs the AI. Start the local server (see README) or open Ladle inside Claude.</span></div>`}
    <button type="submit" class="btn primary" ${AI?'':'disabled'}>Show me what it costs</button>
    <p class="small muted">You'll get 3 versions at different prices: a cheap one, a standard one and an upgraded one.</p>
  </form></main>`;
}
function pantryView(){
  const r = S.req;
  const quick = OPT.pantryQuick.filter(x => !r.have.includes(x));
  return `${headerBack('Cook with what you have','Ladle works out what to make','home')}
  <main><form class="inner pad" id="reqform">
    ${imagesOk ? (S.scanning
      ? `<div class="photo-drop" aria-live="polite">${ico('camera')}<span class="tx"><strong>Looking at your photo…</strong><span>Spotting the ingredients. This takes a few seconds.</span></span></div>`
      : `<label class="photo-drop" for="fridgephoto">${ico('camera')}<span class="tx"><strong>Snap your fridge or cupboard</strong><span>Chef spots the ingredients and adds them for you.</span></span></label>
         <input id="fridgephoto" type="file" accept="${esc(imgAccept)}" capture="environment" class="sr">`) : ''}
    <div class="field"><label for="haveInput">${imagesOk ? 'Or type what you have' : 'What do you have?'}</label>
      <div class="composer"><input id="haveInput" type="text" data-bind="req.haveInput" value="${esc(r.haveInput)}" placeholder="e.g. gizzards, then press Add" autocomplete="off">
      <button type="button" class="iconbtn send" data-act="addhave" aria-label="Add ingredient">${ico('plus')}</button></div>
      ${r.have.length ? `<div class="wrap">${r.have.map((h,i)=>`<button type="button" class="chip x" data-act="rmhave" data-v="${i}" aria-label="Remove ${esc(h)}">${esc(h)}${ico('x')}</button>`).join('')}</div>` : `<span class="hint" style="margin-top:0">Add at least two things.</span>`}
      <span class="eyebrow" style="margin-top:4px">Quick add</span>
      <div class="wrap">${quick.map(q=>`<button type="button" class="chip" data-act="quickhave" data-v="${esc(q)}">+ ${esc(q)}</button>`).join('')}</div>
    </div>
    <div class="field"><label for="want">Something you want to make? (optional)</label>
      <input id="want" type="text" data-bind="req.want" value="${esc(r.want)}" placeholder="e.g. a stew, something like a curry"></div>
    <div class="row2">
      <div class="field"><label for="budget">Extra spend (R)</label><input id="budget" type="number" inputmode="decimal" min="0" step="5" data-bind="req.budget" value="${esc(r.budget)}"></div>
      <div class="field"><label for="people">People</label><input id="people" type="number" inputmode="numeric" min="1" max="12" data-bind="req.people" value="${esc(r.people)}"></div>
    </div>
    <div class="field"><span class="lbl">Which meal?</span>${chips('req.meal', OPT.meal, r.meal, false)}</div>
    <div class="field"><span class="lbl">Mood (optional)</span>${chips('req.moods', OPT.moods, r.moods)}</div>
    ${bulkBlock()}
    ${AI ? '' : `<div class="warn">${ico('alert')}<span>Meal planning uses Claude. Open this page inside Claude to plan meals.</span></div>`}
    <button type="submit" class="btn primary" ${AI && r.have.length>=2 ?'':'disabled'}>What can I make?</button>
  </form></main>`;
}

/* ---------- loading / ideas ---------- */
function loadingView(){
  const back = S.error?.kind==='recipe' ? 'ideas' : (S.req?.mode || 'home');
  if (S.error){
    return `${headerBack('Ladle','',back)}<main><div class="inner pad"><div class="warn">${ico('alert')}<span>${esc(S.error.msg)}</span></div>
      <button class="btn primary" data-act="retry">${ico('refresh')}Try again</button></div></main>`;
  }
  const label = S.job?.label || 'Working…';
  const sub = S.job?.kind === 'recipe' ? 'Pricing the shopping, working out calories and writing why each step matters. This can take up to a minute.'
    : (S.req?.mode==='dish' && S.req.photo && !S.req.identified) ? 'Working out what the dish in your photo is, then pricing 3 ways to make it at home.'
    : 'Matching your budget, mood and taste profile.';
  return `${headerBack('Ladle','',back)}<main><div class="loading pad">${potSvg()}<h2>${esc(label)}</h2><p class="muted" style="max-width:34ch">${sub}</p>
    <button class="btn small" data-act="cancel">${ico('stop')}Stop</button></div></main>`;
}
function ideasView(){
  const r = S.req;
  const bulk = r.bulk ? ` · bulk, ${portions()} portions` : '';
  const sub = r.mode==='budget' ? `R${num(r.budget)} · ${r.people} ${r.people>1?'people':'person'}${bulk}`
    : r.mode==='dish' ? `${(r.identified?.dish || r.want.trim()).slice(0,40)}${(r.identified?.dish || r.want.trim()).length>40?'…':''}${bulk}`
    : `${r.have.length} ingredients · +R${num(r.budget)} extra${bulk}`;
  return `${headerBack(r.mode==='dish'?'Pick a version':'Pick a meal', sub, r.mode)}
  <main><div class="inner pad">
    ${r.mode==='dish' && r.identified ? `<section class="photo-pick" style="align-items:flex-start">
      ${r.photo ? `<img src="${r.photo.url}" alt="Your photo">` : ''}
      <div class="tx"><span class="eyebrow">Looks like</span><strong>${esc(r.identified.dish)}</strong><span>${esc(r.identified.description)}</span>
        <button type="button" class="linkbtn" data-act="go" data-v="dish">Not right? Add a note and try again</button></div>
    </section>
    ${r.identified.conflicts ? `<div class="warn">${ico('alert')}<span>${esc(r.identified.conflicts)} The versions below work around it.</span></div>` : ''}` : ''}
    ${S.ideas.map((x,i) => `<article class="card idea">
      <h2>${esc(x.name)}</h2>
      <p>${esc(x.pitch)}</p>
      <div class="stats"><span class="pill"><strong>${R(x.estCost)}</strong>${r.mode==='pantry'?' extra':' total'}</span>${x.costPerPortion?`<span class="pill">${R(x.costPerPortion)} a portion</span>`:''}<span class="pill">${ico('flame')}${x.kcalPerServing} kcal</span><span class="pill">${ico('clock')}${x.minutes} min</span></div>
      <p class="small muted">${x.keyIngredients.map(esc).join(' · ')}</p>
      <button class="btn primary" data-act="pickidea" data-v="${i}">Cook this</button>
    </article>`).join('')}
    <button class="btn" data-act="moreideas">${ico('refresh')}${r.mode==='dish'?'Show me 3 other ways':'Show me 3 different meals'}</button>
    <p class="small muted">Prices are estimates for South African supermarkets. Check your store's shelf price.</p>
  </div></main>`;
}

/* ---------- kitchen ---------- */
function focusView(){
  const r = S.recipe, i = S.focus, s = r.steps[i], last = i === r.steps.length-1;
  return `<header class="bar pad">
    <button class="iconbtn" data-act="fexit" aria-label="Leave step-by-step mode">${ico('x')}</button>
    <div class="title"><strong>${esc(r.name)}</strong><span class="tnum">Step ${i+1} of ${r.steps.length}</span></div>
  </header>
  <main><div class="inner pad" style="gap:22px">
    <div style="display:grid;grid-template-columns:repeat(${r.steps.length},minmax(0,1fr));gap:4px">${r.steps.map((_,k)=>`<i style="height:4px;border-radius:2px;background:${k<=i?'var(--accent)':'var(--line)'}"></i>`).join('')}</div>
    ${timerBanner()}
    <h1 style="font-size:30px;line-height:1.2">${esc(s.text)}</h1>
    ${s.why ? `<div class="note">${ico('hat')}<span><b>Why: </b>${esc(s.why)}</span></div>` : ''}
    <div class="wrap">
      ${s.minutes ? `<button class="btn" data-act="timer" data-v="${i}">${ico('clock')}Start ${s.minutes} min timer</button>` : ''}
      <button class="btn" data-act="askstepn" data-v="${i}">${ico('hat')}Ask Chef about this</button>
    </div>
  </div></main>
  <footer class="actions pad"><div class="row2">
    <button class="btn" data-act="fprev" ${i===0?'disabled':''}>Back</button>
    <button class="btn primary" data-act="fnext">${last?'Finish':'Next step'}</button>
  </div></footer>`;
}
function kitchenView(){
  if (S.focus !== null && S.focus !== undefined) return focusView();
  const r = S.recipe;
  const total = r.shopping.reduce((a,x)=>a+num(x.price),0);
  const tabs = [['plan','Plan'],['cook','Cook'],['chef','Ask Chef']];
  const body = S.tab==='plan' ? planTab(r,total) : S.tab==='cook' ? cookTab(r) : chefTab(r);
  return `<header class="bar pad" style="flex-wrap:wrap">
    <button class="iconbtn" data-act="go" data-v="home" aria-label="Home">${ico('back')}</button>
    <div class="title"><strong>${esc(r.name)}</strong><span class="tnum">${R(total)} · ${r.nutrition.kcal} kcal/serving · serves ${r.servings}</span></div>
    <div class="tabs" role="tablist" style="flex-basis:100%">${tabs.map(([k,l])=>`<button role="tab" data-act="tab" data-v="${k}" aria-selected="${S.tab===k}">${l}</button>`).join('')}</div>
  </header>
  <main><div class="inner pad">${timerBanner()}${body}</div></main>
  ${S.tab==='chef' ? chefComposer() : S.tab==='plan' ? `<footer class="actions pad"><button class="btn primary" data-act="ate">${ico('plus')}I ate a serving (+${r.nutrition.kcal} kcal)</button></footer>` : ''}`;
}
function planTab(r, total){
  const budget = num(S.req.budget), hits = allergyHits(r), t = target();
  const left = t ? t - eatenToday() : null;
  const perPortion = total / Math.max(1, r.servings);
  const upTotal = r.upgrades.reduce((a,u)=>a+num(u.price),0);
  return `
    ${hits.length ? `<div class="warn">${ico('alert')}<span>Check this: the recipe mentions ${hits.map(esc).join(', ')}, which is on your allergy list. Ask Chef for a swap before you cook.</span></div>` : ''}
    <p>${esc(r.summary)}</p>
    <div class="row2">
      <div class="surface"><span class="eyebrow">Cost</span><span class="bignum" style="font-size:26px">${R(total)}</span>
        ${budget>0 ? `<div class="meter ${total>budget?'over':''}"><i style="width:${Math.min(100,total/budget*100)}%"></i></div>
        <span class="small muted tnum">${total<=budget?`${R(budget-total)} under your R${budget}`:`${R(total-budget)} over your R${budget}`}</span>` : ''}
        <span class="small muted tnum">${R(perPortion)} a portion · ${r.servings} portions</span></div>
      <div class="surface"><span class="eyebrow">Per portion</span><span class="bignum" style="font-size:26px">${r.nutrition.kcal}<span class="small muted" style="font-family:var(--f-body)"> kcal</span></span>
        ${t ? `<div class="meter ${r.nutrition.kcal>left?'over':''}"><i style="width:${Math.min(100, left>0 ? r.nutrition.kcal/left*100 : 100)}%"></i></div>
        <span class="small muted tnum">${left>0 ? `${left} kcal left today` : 'Over today\'s target'}</span>` : `<span class="small muted tnum">P ${r.nutrition.protein} g · C ${r.nutrition.carbs} g · F ${r.nutrition.fat} g</span>`}</div>
    </div>
    <div class="wrap"><span class="pill">Protein ${r.nutrition.protein} g</span><span class="pill">Carbs ${r.nutrition.carbs} g</span><span class="pill">Fat ${r.nutrition.fat} g</span></div>
    ${r.healthNote ? `<div class="good">${ico('leaf')}<span>${esc(r.healthNote)}</span></div>` : ''}

    <section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3>Shopping list <span class="small muted tnum" style="font-family:var(--f-body);font-weight:500">· ${R(total)}</span></h3>
      ${r.shopping.length ? `<button class="btn small" data-act="copylist">${ico('copy')}Copy</button>` : ''}</div>
      ${S.copyText ? `<label for="copytext" class="sr">Shopping list text</label><textarea id="copytext" readonly rows="6">${esc(S.copyText)}</textarea>` : ''}
      ${r.shopping.length ? `<div class="list">${r.shopping.map((s,i)=>`<label class="li ${S.checked[i]?'done':''}" for="shop${i}"><input type="checkbox" id="shop${i}" data-act="check" data-v="${i}" ${S.checked[i]?'checked':''}><span class="grow">${esc(s.item)}${s.qty?` <span class="muted small">· ${esc(s.qty)}</span>`:''}</span><span class="price tnum">${R(s.price)}</span></label>`).join('')}</div>` : `<p class="muted small">Nothing to buy. You have everything.</p>`}
      ${r.pantry.length ? `<p class="small muted">From your kitchen: ${r.pantry.map(esc).join(', ')}</p>` : ''}
      <p class="small muted">Estimated prices. Check the shelf.</p>
    </section>

    ${r.upgrades.length ? `<section class="card"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><h3>Worth buying to level it up</h3><span class="small muted tnum">+${R(upTotal)}</span></div>
      <div class="list">${r.upgrades.map(u=>`<div class="li"><span class="grow"><b style="font-weight:600">${esc(u.item)}</b><br><span class="small muted">${esc(u.effect)}</span></span><span class="price tnum">+${R(u.price)}</span></div>`).join('')}</div>
    </section>` : ''}

    ${r.bulk ? `<section class="card"><h3>Bulk cooking plan</h3>
      <div class="tweak"><strong>Storing it</strong><span>${esc(r.bulk.storage)}</span></div>
      <div class="tweak"><strong>Reheating</strong><span>${esc(r.bulk.reheat)}</span></div>
      ${r.bulk.tip ? `<div class="tweak"><strong>Keep it interesting</strong><span>${esc(r.bulk.tip)}</span></div>` : ''}
    </section>` : ''}

    <section class="card"><h3>Ingredients <span class="small muted" style="font-family:var(--f-body);font-weight:500">· tap one to ask about it</span></h3>
      <div>${r.ingredients.map((g,i)=>{ const open = S.openIng===i; return `<div class="ing">
        <button data-act="ing" data-v="${i}" aria-expanded="${open}"><span class="grow"><b>${esc(g.name)}</b><small>${esc(g.amount)}</small></span>${ico(open?'down':'chev')}</button>
        ${open ? `<div class="more"><div class="role"><b>What it does: </b>${esc(g.role)}</div>
          <div class="wrap">
            <button class="chip ask" data-act="ask" data-q="${esc(`If I leave out the ${g.name}, what happens to the taste, texture, cost and calories?`)}">What if I leave it out?</button>
            <button class="chip ask" data-act="ask" data-q="${esc(`What can I swap the ${g.name} for, and how will that change the dish?`)}">What can I swap it for?</button>
            <button class="chip ask" data-act="ask" data-q="${esc(`What happens if I double the ${g.name}?`)}">What if I double it?</button>
            <button class="chip ask" data-act="ask" data-q="${esc(`How do I get the most flavour out of the ${g.name} in this dish?`)}">Get more flavour from it</button>
          </div></div>` : ''}
      </div>`; }).join('')}</div>
    </section>

    <section class="card"><h3>Change the taste</h3>
      <div>${r.tweaks.map(t=>`<div class="tweak"><strong>${esc(t.goal)}</strong><span>${esc(t.change)}</span><small>${esc(t.why)}</small></div>`).join('')}</div>
      <button class="btn small" data-act="tab" data-v="chef">${ico('hat')}Ask Chef for something else</button>
    </section>`;
}
function cookTab(r){
  return `<button class="btn primary" data-act="focus">${ico('play')}Step-by-step mode</button>
    <section><div class="list">${r.steps.map((s,i)=>`<div class="step">
      <span class="n">${i+1}</span>
      <div class="body"><span class="t">${esc(s.text)}</span>
        ${s.why ? `<span class="why"><b>Why</b>${esc(s.why)}</span>` : ''}
        <div class="wrap">
          ${s.minutes ? `<button class="timerbtn" data-act="timer" data-v="${i}">${ico('clock')}Start ${s.minutes} min timer</button>` : ''}
          <button class="timerbtn" data-act="askstepn" data-v="${i}">${ico('hat')}Ask about this step</button>
        </div>
      </div></div>`).join('')}</div></section>
    <div class="wrap">
      <button class="chip ask" data-act="ask" data-q="How do I know when this dish is properly cooked?">How do I know it's done?</button>
      <button class="chip ask" data-act="ask" data-q="Something went wrong while cooking. How do I rescue it?">Something went wrong</button>
    </div>`;
}
function chefTab(r){
  const c = S.chat;
  const starters = ['Make it spicier','Make it richer','Make it cheaper','Make it lighter','What can I add to make it more filling?'];
  return `${c.turns.length ? '' : `<div class="note">${ico('hat')}<span>Ask me anything about this ${esc(r.name.toLowerCase())}. Try "If I add peanut butter, what happens?" or "What does the soup packet do here?"</span></div>`}
    <div class="msgs">${c.turns.map(t=>`<div class="msg ${t.role==='user'?'me':''}">${t.photoUrl?`<img src="${t.photoUrl}" alt="Photo you sent" style="max-width:160px;border-radius:12px;margin-bottom:6px">`:''}<div class="bubble">${esc(t.content.replace(/\n\[The cook attached a photo\.\]$/,''))}</div></div>`).join('')}
      ${c.busy ? `<div class="msg"><div class="bubble thinking" id="live">Thinking…</div></div>` : ''}</div>
    ${c.busy ? '' : `<div class="wrap">${starters.map(q=>`<button class="chip ask" data-act="ask" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>`}`;
}
function chefComposer(){
  const c = S.chat;
  return `<footer class="actions pad">
    ${S.photo ? `<div style="display:flex;align-items:center;gap:10px"><img src="${S.photo.url}" alt="Photo to send" style="width:44px;height:44px;object-fit:cover;border-radius:10px"><span class="small muted" style="flex:1">Photo attached. Say what Chef should look at.</span><button class="chip" data-act="unphoto">Remove</button></div>` : ''}
    <form class="composer" id="chatform">
    ${imagesOk && !c.busy ? `<label class="iconbtn" for="photo" style="cursor:pointer" aria-label="Send Chef a photo of your food">${ico('camera')}</label><input id="photo" type="file" accept="${esc(imgAccept)}" capture="environment" class="sr">` : ''}
    <label for="q" class="sr">Ask Chef</label>
    <input id="q" type="text" placeholder="${S.photo?'e.g. Is this browned enough?':'If I add…, what happens?'}" autocomplete="off" ${c.busy?'disabled':''}>
    ${c.busy ? `<button type="button" class="iconbtn" data-act="stopchat" aria-label="Stop the answer">${ico('stop')}</button>` : `<button type="submit" class="iconbtn send" aria-label="Send">${ico('send')}</button>`}
  </form></footer>`;
}

/* ---------- tracker ---------- */
function trackerView(){
  const t = target(), eaten = eatenToday(), left = t ? t - eaten : 0, td = today();
  const days = [];
  for (let k=6; k>=0; k--){ const d = new Date(); d.setDate(d.getDate()-k); const key = dayKey(d);
    const rec = S.days.find(x=>x.date===key); days.push({ key, label: k===0?'Today':d.toLocaleDateString('en-ZA',{weekday:'short'}), kcal: rec ? rec.entries.reduce((a,e)=>a+num(e.kcal),0) : 0 }); }
  const max = Math.max(t ? t*1.25 : 1, ...days.map(d=>d.kcal));
  return `${headerBack('Calorie tracker', t ? `Target ${t} kcal a day` : 'Keep an eye on what you eat','home')}
  <main><div class="inner pad">
    <section class="surface">
      <span class="eyebrow">Today</span>
      <div style="display:flex;align-items:baseline;gap:6px"><span class="bignum">${eaten}</span><span class="muted tnum">${t?`/ ${t} kcal`:'kcal'}</span></div>
      ${t ? `<div class="meter ${eaten>t?'over':''}"><i style="width:${Math.min(100,eaten/t*100)}%"></i></div>
      <span class="small ${left<0?'':'muted'} tnum" style="${left<0?'color:var(--accent);font-weight:600':''}">${left>=0?`${left} kcal left`:`${-left} kcal over target`}</span>` : ''}
      ${(() => { const m = td.entries.reduce((a,e)=>({p:a.p+num(e.protein),c:a.c+num(e.carbs),f:a.f+num(e.fat)}),{p:0,c:0,f:0});
        return (m.p||m.c||m.f) ? `<div class="wrap"><span class="pill">Protein ${m.p} g</span><span class="pill">Carbs ${m.c} g</span><span class="pill">Fat ${m.f} g</span></div><span class="small muted">From meals cooked in Ladle.</span>` : ''; })()}
      <div class="composer" style="margin-top:4px">
        <label for="target" class="sr">Daily calorie target</label>
        <input id="target" type="number" inputmode="numeric" min="1200" max="4500" step="50" value="${t||''}" placeholder="Daily target (optional)" style="border-radius:12px">
        <button type="button" class="btn small" data-act="settarget">${t?'Update':'Set target'}</button>
      </div>
    </section>
    <section class="card"><h3>Eaten today</h3>
      ${td.entries.length ? `<div class="list">${td.entries.map((e,i)=>`<div class="li"><span class="grow">${esc(e.name)}<br><span class="small muted">${new Date(e.at).toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</span></span><span class="price tnum">${num(e.kcal)} kcal</span><button class="x-btn" data-act="rmfood" data-v="${i}" aria-label="Remove ${esc(e.name)}">${ico('x')}</button></div>`).join('')}</div>` : `<p class="muted small">Nothing yet. Meals you cook in Ladle land here when you tap "I ate a serving".</p>`}
      <form id="addform" style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:12px">
        <span class="lbl" style="font-weight:600;font-size:14px">Add something else</span>
        <label for="addname" class="sr">Food</label><input id="addname" type="text" data-bind="add.name" value="${esc(S.add.name)}" placeholder="e.g. 2 slices brown bread with peanut butter">
        <div class="composer">
          <label for="addkcal" class="sr">Calories</label><input id="addkcal" type="number" inputmode="numeric" min="0" data-bind="add.kcal" value="${esc(S.add.kcal)}" placeholder="kcal" style="max-width:120px;border-radius:12px">
          ${AI ? `<button type="button" class="btn small" data-act="estimate" ${S.estimating?'disabled':''}>${S.estimating?'Estimating…':'Estimate for me'}</button>` : ''}
          <button type="submit" class="btn small primary">Add</button>
        </div>
      </form>
    </section>
    <section class="card"><h3>Last 7 days</h3>
      <div class="week">
        ${days.map(d=>`<div class="col"><small>${d.kcal||''}</small><div class="bar ${d.kcal? (t && d.kcal>t?'over':'') : 'zero'}" style="height:${d.kcal? Math.max(4, d.kcal/max*70) : 0}%"></div><small>${esc(d.label)}</small></div>`).join('')}
      </div>
      <p class="small muted">${t ? `Red days went over your ${t} kcal target.` : 'Set a daily target above to see which days went over.'}</p>
    </section>
  </div></main>`;
}

/* ================= render & routing ================= */
function go(v){ S.view = v; render(); document.querySelector('main')?.scrollTo(0,0); }
function render(){
  const v = S.view;
  app.innerHTML =
    v==='boot' ? bootView() :
    v==='onboard' ? profileView(true) :
    v==='profile' ? profileView(false) :
    v==='home' ? homeView() :
    v==='budget' ? budgetView() :
    v==='dish' ? dishView() :
    v==='pantry' ? pantryView() :
    v==='loading' ? loadingView() :
    v==='ideas' ? ideasView() :
    v==='kitchen' ? kitchenView() :
    v==='tracker' ? trackerView() : homeView();
}

/* ================= events ================= */
function getPath(path){ return path.split('.').reduce((o,k)=>o?.[k], S); }
function setPath(path, val){ const ks = path.split('.'); const last = ks.pop(); const o = ks.reduce((a,k)=>a[k], S); o[last] = val; }
function addHave(v){
  const r = S.req; v = String(v||'').trim(); if (!v) return;
  v.split(',').map(s=>s.trim()).filter(Boolean).forEach(x => { if (!r.have.some(h=>h.toLowerCase()===x.toLowerCase())) r.have.push(x); });
  r.haveInput = ''; render(); document.getElementById('haveInput')?.focus();
}

app.addEventListener('input', (e) => {
  const b = e.target.dataset?.bind; if (!b) return;
  setPath(b, e.target.value);
  if (b==='req.people' || b==='req.meals'){ const el = document.getElementById('portions'); if (el) el.textContent = portionsText(); }
});
app.addEventListener('keydown', (e) => {
  if (e.target.id==='haveInput' && e.key==='Enter'){ e.preventDefault(); addHave(e.target.value); }
});
app.addEventListener('change', (e) => {
  if (e.target.dataset?.act === 'check'){ const i = e.target.dataset.v; S.checked[i] = e.target.checked; e.target.closest('.li')?.classList.toggle('done', e.target.checked); saveSession(); }
  if (e.target.id === 'dishphoto'){
    const f = e.target.files?.[0]; if (!f) return;
    if (S.req.photo) URL.revokeObjectURL(S.req.photo.url);
    S.req.photo = { file:f, url:URL.createObjectURL(f) }; S.req.identified = null; render(); return;
  }
  if (e.target.id === 'fridgephoto'){ const f = e.target.files?.[0]; if (f) scanFridge(f); return; }
  if (e.target.id === 'photo'){ const f = e.target.files?.[0]; if (!f) return; S.photo = { file:f, url:URL.createObjectURL(f) }; render(); document.getElementById('q')?.focus(); }
});
app.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b || b.tagName==='INPUT') return;
  const act = b.dataset.act, v = b.dataset.v;
  switch(act){
    case 'go':
      if (v==='profile') S.draft = newDraft(S.profile);
      if (v==='kitchen' && !S.recipe) return go('home');
      return go(v);
    case 'toggle': { const arr = getPath(b.dataset.path); const i = arr.indexOf(v); i>=0 ? arr.splice(i,1) : arr.push(v); return render(); }
    case 'pick': setPath(b.dataset.path, v); return render();
    case 'flip': setTheme(isDark() ? 'light' : 'dark'); return render();
    case 'theme': setTheme(v); return render();
    case 'copylist': return copyList();
    case 'focus': S.focus = 0; try{ navigator.wakeLock?.request('screen').catch(()=>{}); }catch(err){} return render();
    case 'fprev': S.focus = Math.max(0, S.focus-1); return render();
    case 'fnext': if (S.focus >= S.recipe.steps.length-1){ S.focus = null; toast('All steps done. Enjoy!'); } else S.focus++; return render();
    case 'fexit': S.focus = null; return render();
    case 'askstepn': { const i = Number(v), s = S.recipe.steps[i]; S.focus = null; return askChef(`About step ${i+1} ("${s.text}"): what is the most common mistake here, and how do I know I'm doing it right?`); }
    case 'rmdishphoto': if (S.req.photo) URL.revokeObjectURL(S.req.photo.url); S.req.photo = null; S.req.identified = null; return render();
    case 'unphoto': if (S.photo) URL.revokeObjectURL(S.photo.url); S.photo = null; return render();
    case 'bulk': S.req.bulk = !S.req.bulk; return render();
    case 'settarget': {
      const k = Math.round(num(document.getElementById('target')?.value));
      if (k && (k < 1200 || k > 4500)) return toast('Pick a target between 1200 and 4500 kcal.');
      S.profile = { ...S.profile, kcal: k || null };
      try{ await P.saveProfile(S.profile); }catch(err){}
      toast(k ? `Daily target set to ${k} kcal.` : 'Target removed.'); return render();
    }
    case 'start': S.req = newReq(v); S.seen = []; return go(v);
    case 'addhave': return addHave(S.req.haveInput);
    case 'quickhave': return addHave(v);
    case 'rmhave': S.req.have.splice(Number(v),1); return render();
    case 'cancel': S.job?.ctl.abort(); return;
    case 'retry': return S.error?.kind==='recipe' ? runJob('recipe','Writing your recipe') : runJob('ideas','Finding meals for you');
    case 'pickidea': S.idea = S.ideas[Number(v)]; return runJob('recipe', `Writing ${S.idea.name}`);
    case 'moreideas': return runJob('ideas','Finding 3 new meals');
    case 'tab': S.tab = v; render(); if (v==='chef') scrollChat(); else document.querySelector('main')?.scrollTo(0,0); return;
    case 'ing': S.openIng = S.openIng===Number(v) ? null : Number(v); return render();
    case 'ask': return askChef(b.dataset.q);
    case 'stopchat': S.chat.ctl?.abort(); return;
    case 'timer': { const s = S.recipe.steps[Number(v)]; return startTimer(s.minutes, `Step ${Number(v)+1}: ${s.text.slice(0,40)}${s.text.length>40?'…':''}`); }
    case 'tstop': return stopTimer();
    case 'ate': await logFood(S.recipe.name, S.recipe.nutrition.kcal, S.recipe.nutrition); toast(`Logged ${S.recipe.nutrition.kcal} kcal.${target() ? ` ${target()-eatenToday()} kcal left today.` : ` ${eatenToday()} kcal today.`}`); return render();
    case 'rmfood': await removeFood(Number(v)); return render();
    case 'estimate': return estimateKcal();
  }
});
app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = e.target.id;
  if (id==='profileform'){
    const p = { ...S.draft, kcal: S.profile?.kcal || null };
    S.saving = true; render();
    try{ await P.saveProfile(p); }catch(err){ toast("Couldn't save to your account. It's kept on this device."); }
    S.profile = p; S.saving = false;
    toast(S.view==='onboard' ? 'Profile saved. Let\'s cook.' : 'Profile updated.');
    return go('home');
  }
  if (id==='reqform'){
    const r = S.req;
    r.budget = Math.max(0, num(r.budget)); r.people = Math.min(12, Math.max(1, Math.round(num(r.people,1))));
    if (r.mode==='budget' && r.budget < 10) return toast('Set a budget of at least R10.');
    if (r.mode==='pantry' && r.have.length < 2) return toast('Add at least two ingredients.');
    if (r.mode==='dish' && !r.want.trim() && !r.photo) return toast('Upload a photo or describe what you want to make.');
    r.identified = null;
    r.meals = Math.min(14, Math.max(2, Math.round(num(r.meals,5))));
    S.seen = [];
    return runJob('ideas', 'Finding meals for you');
  }
  if (id==='chatform'){ const q = document.getElementById('q'); const val = q.value; q.value=''; return askChef(val); }
  if (id==='addform'){
    const name = S.add.name.trim(), kcal = Math.round(num(S.add.kcal));
    if (!name || !kcal) return toast('Add a food and its calories.');
    await logFood(name, kcal); S.add = { name:'', kcal:'' }; toast(`Added ${kcal} kcal.`); return render();
  }
});

/* ================= boot ================= */
(async () => {
  render();
  await Promise.all([P.init(), initAI()]);
  S.profile = await P.getProfile();
  S.days = await P.getDays();
  loadSession();
  if (S.profile){ go('home'); }
  else { S.draft = newDraft(); go('onboard'); }
})();
