# Ladle Kitchen

A cooking app for South African home cooks that teaches **why** things work. You build a taste profile, then:

- **I have a budget**: "R80, tired, want something warm" → 3 meals that fit, with shopping lists and prices.
- **I want to make something**: describe a dish *or upload a photo of it* → cheap, standard and upgraded versions, priced.
- **I have ingredients**: type them or snap your fridge → what you can make, plus anything cheap to add.
- **Cook in bulk**: a switch on all three. It plans portions, bigger packs, and storage and reheating.
- **Kitchen**: shopping list, what every ingredient does, steps with the reason for each, timers, step-by-step mode, and **Ask Chef** ("If I add X, what happens?"). Photos work in Chef too.
- **Calorie tracker** with an optional daily target, macros and a 7-day chart.
- Light and dark mode.

---

## Run it

You need **Node.js 18 or newer** (https://nodejs.org) and **one** AI key:

- **Free:** a Google Gemini key from https://aistudio.google.com/apikey (set `AI_PROVIDER=gemini`)
- **Paid:** a Claude API key from https://console.anthropic.com (set `AI_PROVIDER=claude`)

```bash
# 1. in this folder, make your settings file
cp .env.example .env          # Windows: copy .env.example .env
# 2. open .env, set AI_PROVIDER and paste the matching key
# 3. start it
npm start
```

The terminal tells you which AI and models are running. On Gemini's free tier Google may use your prompts to improve its products, so don't send anything private.

Open **http://localhost:3000**. There's nothing to install: `server.js` only uses Node's built-in modules.

In VS Code: open the folder, then press **Ctrl+`** for a terminal and run `npm start`.

> Opening `index.html` straight from your file explorer still shows the screens, the profile and the tracker. The AI features need the server, because the browser can't call the Claude API on its own (and your key must not go in browser code).

---

## How it fits together

```
index.html        page shell: loads the fonts, styles.css, then the two scripts
styles.css        all styling; colours are tokens on :root, and dark mode redefines them
js/local-ai.js    stand-in for Claude's page API when running locally → calls server.js
js/app.js         the whole app (state, prompts, screens, events)
server.js         serves the files + forwards AI requests to the Claude API
.env              your API key and model choices (never commit this)
```

**The flow:** a button has a `data-act="..."` name → the click handler in the **events** section changes the state object `S` → `render()` redraws the current screen from `S`.

### Map of `js/app.js` (search for the `/* ===== ... ===== */` headings)

| Section | What's in it | Typical edits |
|---|---|---|
| icons & helpers | SVG icons, money formatting, theme switching, toasts | add an icon |
| options | chip choices: flavours, foods, allergies, moods, stores | **easiest place to start** |
| storage | `P`: saving the profile and calorie log (account or localStorage) | swap in Firebase or Supabase |
| Claude | AI setup, error messages, fridge scan, copy list, saving the session | |
| state | `S`, the single object holding everything on screen | |
| prompts | what the AI is told and the JSON shapes it must return | **change the AI's behaviour here** |
| normalisers | cleans the AI's JSON, allergy keyword check | add fields you add to the prompts |
| jobs | `runJob` (ideas and recipes), `askChef`, calorie estimate | |
| calorie log / timer | tracker storage, cooking timer and beep | |
| view pieces | every screen as a function returning HTML: `homeView`, `dishView`, `kitchenView`, `trackerView`… | layouts, new screens |
| render & routing | `go(view)` and `render()` | register a new screen |
| events | what every `data-act` button does, plus form submits | new buttons |
| boot | loads the profile, then shows onboarding or home | |

### Adding a feature, for example "save favourite recipes"
1. Add the state to `S` (for example `favourites: []`), and load and save it in `P`.
2. Add a button in a view: `<button data-act="fav">Save</button>`.
3. Handle `case 'fav':` in the click handler, then call `render()`.

---

## AI and models

All AI calls go through two functions: `AI(input, opts)` for chat text and `AI.json(prompt, opts)` for structured answers. `opts.modelTier` picks the model, and you can change the mapping in `.env`:

| tier | used for | Gemini default | Claude default |
|---|---|---|---|
| `quick` | meal ideas, Chef chat, calorie estimates | `gemini-2.5-flash` | `claude-haiku-5-5` |
| `default` | full recipes, dish-photo analysis, fridge scan | `gemini-2.5-flash` | `claude-sonnet-5-5` |

`server.js` has one function per provider (`callGemini`, `callClaude`). To add another AI, write one more function that takes the same messages and returns `{ text, truncated }`. Images are sent as base64 (JPG, PNG, GIF or WebP).

## Phone app (iPhone and Android)

The native app lives in **`mobile/`** (Expo SDK 58). It uses this same server for the AI. In `.env` here, add `HOST=0.0.0.0` (and ideally a `LADLE_TOKEN` password), run `npm start`, then follow **`mobile/README.md`**.

## Going further
- **Real accounts:** replace the `P` object's four functions (`getProfile`, `saveProfile`, `getDays`, `saveDay`) with a database.
- **Live prices:** prices are AI estimates. Real store prices would need a price data source.
- **Streaming answers:** `server.js` waits for the full reply. The Claude API supports streaming if you want Chef's text to appear as it types.

Docs: https://docs.claude.com (Messages API, vision)
