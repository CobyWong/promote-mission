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

Set mobile app environment in `.env.local`:

- Local dev: `EXPO_PUBLIC_APP_ENV=development`
- Staging builds: `EXPO_PUBLIC_APP_ENV=staging`
- Production builds: `EXPO_PUBLIC_APP_ENV=production`

3. Add Supabase public values in `.env.local`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Example `.env.local` for staging:

```bash
EXPO_PUBLIC_APP_ENV=staging
EXPO_PUBLIC_API_BASE_URL=https://your-staging-domain.com
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

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
- Proof submission flow (to `POST /api/mobile/submissions`) with validation, checklist, and success/failure feedback
- Submission history timeline (from `GET /api/mobile/submissions`) with loading/error/retry states
- Expandable history cards with deep actions (open mission, open reel) and paginated "load more"
- History status filters + mission/brand search + AsyncStorage cache hydration for faster first paint
- Server-side status/search query (`GET /api/mobile/submissions?status=&q=`) + query-aware cache key with TTL invalidation
- Cursor pagination (`cursor`/`nextCursor`) for submission history + DB indexes for cursor and status queries
- Lazy total strategy (`includeTotal=1` only on first page) to avoid frequent `count: exact` cost on every pagination request
- Include total only on filter/search change or manual refresh; load-more/retry paths skip total recount

## Next scope

- Supabase auth on mobile (login + secure session storage)
- Submission flow (`/api/submissions`) from app
- Rewards + profile screens
