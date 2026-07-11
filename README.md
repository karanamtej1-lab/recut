# Recut

Turn viral Instagram/TikTok templates into your own reels — pick a template, drop
your camera-roll clips, and the app renders a finished vertical video with the
template's audio and captions.

## Architecture

Two parts:

| Part | What it does | Runs |
|------|--------------|------|
| **App** (`/`) | Expo (React Native) mobile app — discover templates, auto-fill clips, edit, export | Expo Go / iOS / Android |
| **Render server** (`/server`) | Node + FFmpeg — trims, stitches, adds audio & burns captions into one MP4 | Your Mac / a cloud box |

The phone uploads clips + a spec to the server; the server returns the finished reel.

## Run it

**1. Start the render server** (needs `ffmpeg` on PATH — `brew install ffmpeg`):

```bash
cd server
npm install
npm start          # http://localhost:4000
npm test           # proves the FFmpeg pipeline end-to-end
```

**2. Start the app:**

```bash
npm install
npx expo start
```

- **iOS simulator / web:** talks to `localhost:4000` automatically.
- **Physical phone (Expo Go):** the phone can't see `localhost`. Set your Mac's LAN IP:
  ```bash
  EXPO_PUBLIC_RENDER_URL=http://192.168.x.x:4000 npx expo start
  ```

## Flow

Discover → pick a template → "Use template" (bulk-pick clips, auto-fills every slot)
→ tweak any scene / audio / captions → **Render reel** → save or share.

## What's real vs. stubbed

**Real:** template gallery UI, bulk auto-fill, the full FFmpeg render (trim → scale/crop
to 1080×1920 → concat → audio mix → burned captions), save to camera roll, share.

**Stubbed / next:** template catalog is mock data (no real creator videos yet);
"AI best-moment" picking assigns clips in order; viral audio is a name, not a real
audio file; direct Instagram/TikTok download isn't implemented.
