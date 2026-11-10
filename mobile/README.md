# Ladle (mobile)

The Ladle cooking app as a native iPhone and Android app, built with **Expo SDK 58**, React Native and Expo Router.

The phone app never holds an AI key. It talks to the Ladle server (`../server.js`) on your computer, and the server calls Gemini or Claude.

```
your phone (Expo Go)  ──Wi-Fi──>  server.js on your PC  ──>  Gemini / Claude
```

---

## 1. One-time setup

1. Install **Node.js 18+** on your computer, and the **Expo Go** app on your phone (Play Store or App Store).
2. Put this `mobile` folder inside your `ladle-kitchen` repo, so `server.js` sits one level up.
3. Install the app's packages:
   ```bash
   cd mobile
   npm install
   ```

## 2. Start the server so your phone can reach it

In the **repo root** (`C:\ladle-kitchen`), make sure `.env` has your key, plus:
```
HOST=0.0.0.0
LADLE_TOKEN=pick-any-password
```
Then run `npm start` there. It prints a line like:
```
On your phone (same Wi-Fi): http://192.168.1.23:3000
```
**Windows Firewall** may ask whether Node can use the network. Allow it on **private networks**, or your phone can't connect.

## 3. Tell the app where the server is

In `mobile/`, copy `.env.example` to **`.env.local`** (Git ignores this file) and fill it in with the address from step 2:
```
EXPO_PUBLIC_API_URL=http://192.168.1.23:3000
EXPO_PUBLIC_LADLE_TOKEN=pick-any-password
```

## 4. Run it on your phone

Open a **second terminal**:
```bash
cd mobile
npx expo start
```
Scan the QR code. On **Android**, scan it with the Expo Go app. On **iPhone**, scan it with the Camera app. Your phone and PC must be on the **same Wi-Fi**.

- If the QR code won't connect, try `npx expo start --tunnel`. The server still needs the same Wi-Fi, though.
- If the home screen shows a yellow warning, it explains what's wrong: the server isn't running, the address is wrong, or the password doesn't match.
- After you change `.env.local`, stop Expo and run `npx expo start -c` so it picks up the new values.

---

## Where things are

```
src/
  app/                    screens (each file is a route)
    _layout.tsx           app frame, light/dark theme, splash screen
    index.tsx             home: three ways in, today's calories
    profile.tsx           taste profile and appearance
    plan/[mode].tsx       budget / dish (with photo) / ingredients (with fridge scan)
    ideas.tsx             the 3 meal ideas
    kitchen.tsx           Plan · Cook · Ask Chef tabs
    cook.tsx              step-by-step mode (keeps the screen on)
    tracker.tsx           calorie tracker
  components/
    ui.tsx                buttons, chips, cards, inputs, header, timer banner, toast
    photo.ts              camera / gallery picker
  lib/
    store.ts              all app state + actions (askChef, runIdeas, logFood…)
    prompts.ts            everything the AI is told: edit this to change its behaviour
    ai.ts                 calls to the server
    options.ts            the chip choices (foods, moods, stores…): easiest place to start
    theme.ts              light and dark colours
    types.ts              data shapes
```

**The flow:** a screen calls an action from `useStore()` (for example `runIdeas()`), the action updates the state, and every screen using that state redraws. Data is saved on the phone automatically (AsyncStorage).

## Checks before you commit
```bash
npx tsc --noEmit     # type errors
npx expo lint        # code style and React mistakes
```

## Next steps
- **Use it away from home Wi-Fi:** host `server.js` online, for example on Render's free tier, then set `EXPO_PUBLIC_API_URL` to that `https://` address. Keep `LADLE_TOKEN` set.
- **Install it like a real app** without Expo Go: `npx eas-cli@latest build --profile preview` makes an Android APK. iPhone builds need an Apple Developer account.
- **Timer alerts while the phone is locked:** add `expo-notifications`. The current timer vibrates while the app is open.
