# Promote Mission

A creator mission platform for Hong Kong-style promotional campaigns. Creators browse IG Reels missions, submit proof, earn Coins, climb the leaderboard, and redeem real rewards. The app is now wired for Supabase-powered auth, submission storage, admin review, and coin rewards.

## Features

- Mission marketplace with campaign briefs and payout points
- Mission detail pages with deliverables and submission checklist
- Creator login and registration prototype with onboarding fields
- Mission marketplace backed by Supabase `missions` records
- Proof submission flow backed by Supabase `submissions` records and Storage screenshot uploads
- Instagram Professional account connect flow (Meta OAuth) for Reel metrics sync
- Admin review dashboard with approval flow and coin transaction writes
- Reward catalog + redemption flow backed by Supabase `rewards_catalog` and `reward_redemptions`
- Admin fulfillment panel for processing reward redemption outcomes
- Brand-side mission CRUD console for managing live campaign catalog
- Rewards shop with sample redemption items
- Leaderboard and creator dashboard concepts
- Mobile-first dark UI built with Next.js and Tailwind CSS

## Backend setup

1. Copy `.env.example` to `.env.local`.
2. Fill in:
	- `NEXT_PUBLIC_SUPABASE_URL`
	- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `ADMIN_EMAILS` for allowed review accounts
	- `BRAND_EMAILS` for brand-side mission CRUD accounts
	- `NEXT_PUBLIC_APP_URL`
	- `META_APP_ID`
	- `META_APP_SECRET`
	- `INSTAGRAM_REDIRECT_URI` (default: `http://localhost:3000/api/instagram/callback`)
3. Run the SQL in [supabase/schema.sql](supabase/schema.sql) inside your Supabase SQL editor.
4. Confirm the `submission-screenshots` Storage bucket is created by the SQL script.
5. In Supabase Auth, enable Email/Password provider.
6. Set your project site URL / redirect URL to include `/auth/callback`.
7. In Meta Developer settings, add `INSTAGRAM_REDIRECT_URI` to Valid OAuth Redirect URIs.
8. Ensure each creator uses an Instagram Professional account linked to a Facebook Page.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to view the site.

## Pages

- `/` landing page
- `/missions` mission marketplace
- `/missions/[slug]` mission detail
- `/submit/[slug]` proof submission form
- `/rewards` rewards shop
- `/dashboard` creator dashboard
- `/login` creator login
- `/register` creator signup
- `/admin/reviews` admin moderation demo
- `/admin/redemptions` admin reward fulfillment panel
- `/brand/missions` brand mission CRUD manager

## Data model

- `profiles`: creator onboarding profile synced from auth metadata
- `missions`: live mission catalog for homepage / marketplace / detail pages
- `submissions`: mission proof submissions awaiting review
- `rewards_catalog`: redeemable rewards with cost / stock / ETA
- `reward_redemptions`: creator redemption requests and fulfillment states
- `coin_transactions`: wallet ledger for approved mission rewards
- `instagram_connections`: creator OAuth tokens + linked IG account identifiers
- `reel_insights`: daily Reel metrics snapshots synced from Instagram Graph API

## Notes

- SQL seeds the mission and reward catalog with the current prototype content.
- If Supabase env vars are missing, the app falls back to demo-friendly UI states.
- Admin approval uses the SQL function `approve_submission` to mark the submission approved and insert reward coins atomically.
- Reward redemption uses the SQL function `redeem_reward` to validate balance and insert a negative wallet transaction atomically.
- Proof submission uploads screenshots into the `submission-screenshots` bucket and stores the uploaded paths on each submission row.
- Admin review page renders storage-backed screenshot previews with signed URLs for secure proof inspection.
- Reel metrics sync currently runs from the dashboard "Sync now" button and writes to `reel_insights`.
