# Mission One Mobile (Expo)

This is the Phase 5 mobile app for Mission One, built with Expo + React Native.

## Prerequisites

- Node.js 20+
- A running web backend from this repository (`npm run dev` at repo root)

## Setup

1. Copy env file:

```bash
cp .env.example .env.local
```

2. Set API base URL in `.env.local`:

- iOS simulator: `http://localhost:3000`
- Android emulator: `http://10.0.2.2:3000`
- Physical device: `http://<your-lan-ip>:3000`

3. Add Supabase public values in `.env.local`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## Run

From repo root:

```bash
npm run mobile:start
npm run mobile:ios
npm run mobile:android
npm run mobile:web
```

Or from this folder:

```bash
npm run start
```

## Current Phase 5 scope (batch 1)

- Supabase sign in/sign out on mobile
- Authenticated profile fetch (from `GET /api/mobile/me` with bearer token)
- Missions list screen (from `GET /api/mobile/missions`)
- Mission detail screen (from `GET /api/mobile/missions/[slug]`)

## Next scope

- Supabase auth on mobile (login + secure session storage)
- Submission flow (`/api/submissions`) from app
- Rewards + profile screens
