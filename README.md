# Mission One

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
	- `ADMIN_PASSWORD` (minimum 12 chars; no default fallback)
	- `BRAND_EMAILS` for brand-side mission CRUD accounts
	- `NEXT_PUBLIC_APP_URL`
	- `META_APP_ID`
	- `META_APP_SECRET`
	- `INSTAGRAM_REDIRECT_URI` (default: `http://localhost:3000/api/instagram/callback`)
	- `ERROR_MONITOR_WEBHOOK_URL` (optional, webhook endpoint for API error forwarding)
	- `RATE_LIMIT_SALT` (required for stable, hashed rate-limit keys)
	- `CLEANUP_CRON_TOKEN` (required, protects scheduled cleanup endpoint)
	- `FUNNEL_ALERT_SUBMISSION_DROP_PCT` (optional, default `30`)
	- `FUNNEL_ALERT_APPROVE_DROP_PCT` (optional, default `30`)
	- `FUNNEL_ALERT_REDEEM_DROP_PCT` (optional, default `30`)
	- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (optional; enables distributed rate limiting and idempotency across instances)
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

## Quality checks

Run locally before opening a PR:

```bash
npm run check:env
npm run lint
npm run typecheck
npm run mobile:typecheck
npm run test
npm run build
```

GitHub Actions CI now runs the same checks on push/PR.

## Operator quickstart

If you are releasing this app or handling live incidents, start here:

- Release runbook: [docs/ops/release-checklist-staging-production.md](docs/ops/release-checklist-staging-production.md)
- Rollback incident template: [docs/ops/production-rollback-incident-template.md](docs/ops/production-rollback-incident-template.md)
- Backup/restore drill runbook: [docs/ops/backup-restore-drill.md](docs/ops/backup-restore-drill.md)
- Incident communication playbook: [docs/ops/incident-communication-playbook.md](docs/ops/incident-communication-playbook.md)

Recommended usage:

1. Follow the staging checklist exactly before touching production.
2. During production rollout, keep the incident template open.
3. If rollback triggers fire, execute rollback first, then complete the incident record.

One-command staging release gate (recommended to reduce manual error):

```bash
STAGING_BASE_URL=https://your-staging-domain.com \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD='your-admin-password' \
STAGING_BEARER_TOKEN='optional-mobile-user-jwt' \
E2E_BASE_URL=https://your-staging-domain.com \
E2E_USER_ACCESS_TOKEN='user-access-token' \
E2E_USER_REFRESH_TOKEN='user-refresh-token' \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='your-admin-password' \
E2E_MISSION_SLUG='pulse-active-home-workout' \
E2E_REWARD_SLUG='parknshop-voucher-100' \
RELEASE_GATE_STRICT_E2E=1 \
FAIL_ON_FUNNEL_WARN=0 \
npm run release:gate:staging
```

Interactive production release gate (enforces required checkpoints and aborts on failed confirmation):

```bash
PROD_BASE_URL=https://your-production-domain.com \
PROD_ADMIN_EMAIL=admin@example.com \
PROD_ADMIN_PASSWORD='your-admin-password' \
E2E_BASE_URL=https://your-production-domain.com \
E2E_USER_ACCESS_TOKEN='prod-safe-test-user-access-token' \
E2E_USER_REFRESH_TOKEN='prod-safe-test-user-refresh-token' \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='your-admin-password' \
E2E_MISSION_SLUG='pulse-active-home-workout' \
E2E_REWARD_SLUG='parknshop-voucher-100' \
FAIL_ON_FUNNEL_WARN=0 \
npm run release:gate:production
```

Scheduled idempotency cleanup (Phase W3-08):

1. Set repository secret `CLEANUP_ENDPOINT_URL` to your deployed endpoint, for example `https://your-domain.com/api/admin/idempotency/cleanup`.
2. Set repository secret `CLEANUP_CRON_TOKEN` to the same value as app env `CLEANUP_CRON_TOKEN`.
3. The workflow `.github/workflows/idempotency-cleanup.yml` runs hourly and can also be manually triggered.
4. Optional manual trigger input `retentionDays` controls deletion cutoff (default `7`, allowed `1-30`).

Staging abuse/idempotency verification:

```bash
STAGING_BASE_URL=https://your-staging-domain.com \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD='your-admin-password' \
STAGING_BEARER_TOKEN='optional-mobile-user-jwt' \
npm run verify:staging
```

Funnel regression alert check:

```bash
STAGING_BASE_URL=https://your-staging-domain.com \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD='your-admin-password' \
FAIL_ON_FUNNEL_WARN=0 \
npm run alerts:funnel
```

Funnel baseline and threshold tuning helper:

```bash
STAGING_BASE_URL=https://your-staging-domain.com \
STAGING_ADMIN_EMAIL=admin@example.com \
STAGING_ADMIN_PASSWORD='your-admin-password' \
npm run funnel:baseline
```

Scheduled funnel alert monitor:

- Workflow file: `.github/workflows/funnel-alerts.yml`
- Required repository secrets: `STAGING_BASE_URL`, `STAGING_ADMIN_EMAIL`, `STAGING_ADMIN_PASSWORD`
- Runs hourly and can be triggered manually with `failOnWarn` input (`0` or `1`).

Web E2E smoke test (accept -> submit -> approve -> redeem):

```bash
E2E_BASE_URL=https://your-staging-domain.com \
E2E_USER_ACCESS_TOKEN='user-access-token' \
E2E_USER_REFRESH_TOKEN='user-refresh-token' \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='your-admin-password' \
E2E_MISSION_SLUG='pulse-active-home-workout' \
E2E_REWARD_SLUG='parknshop-voucher-100' \
npm run test:e2e:web
```

Strict E2E redeem mode (must return `201` only):

```bash
E2E_BASE_URL=https://your-staging-domain.com \
E2E_USER_ACCESS_TOKEN='user-access-token' \
E2E_USER_REFRESH_TOKEN='user-refresh-token' \
E2E_ADMIN_EMAIL=admin@example.com \
E2E_ADMIN_PASSWORD='your-admin-password' \
E2E_MISSION_SLUG='pulse-active-home-workout' \
E2E_REWARD_SLUG='parknshop-voucher-100' \
npm run test:e2e:web:strict
```

## Mobile app (Phase 5)

The repository now includes an Expo React Native app at [apps/mobile](apps/mobile).

Setup:

1. Copy [apps/mobile/.env.example](apps/mobile/.env.example) to `.env.local` inside `apps/mobile`.
2. Set `EXPO_PUBLIC_API_BASE_URL`:
	- iOS simulator: `http://localhost:3000`
	- Android emulator: `http://10.0.2.2:3000`
	- Physical device: `http://<your-lan-ip>:3000`
3. Set Supabase values for mobile auth:
	- `EXPO_PUBLIC_SUPABASE_URL`
	- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Run mobile app from repo root:

```bash
npm run mobile:start
npm run mobile:ios
npm run mobile:android
```

Phase 5 batch 1 mobile APIs:

- `GET /api/mobile/missions`
- `GET /api/mobile/missions/[slug]`
- `GET /api/mobile/me` (bearer token)

## Pages

- `/` landing page
- `/missions` mission marketplace
- `/missions/[slug]` mission detail
- `/submit/[slug]` proof submission form
- `/rewards` rewards shop
- `/dashboard` creator dashboard
- `/login` creator login
- `/register` creator signup
- `/privacy` privacy policy
- `/terms` terms of service
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
- Admin login now requires explicit `ADMIN_PASSWORD` and blocks insecure defaults.
- API abuse protection now includes route-level rate limits for admin login, auth session, and submission create paths.
- Rate limiting and idempotency automatically use Upstash Redis (when configured) and fall back to in-memory state in local/dev.
- Idempotency is now persisted in `public.idempotency_keys` to keep replay/inflight protection across instances even without Redis.
- Write endpoints (`/api/submissions`, `/api/mobile/submissions`, `/api/redemptions`) now support `Idempotency-Key` to prevent duplicate writes.
- Scheduled cleanup endpoint `/api/admin/idempotency/cleanup` deletes expired `idempotency_keys` rows using a cron token header (`x-cron-token`).
- Structured API logs now include request metadata and optional webhook forwarding via `ERROR_MONITOR_WEBHOOK_URL`.
- Admin KPI now includes abuse counters (rate-limited requests + idempotency replay/inflight events) and recent abuse signal logs.
- Admin funnel KPI endpoint `/api/admin/kpi/funnel` reports mission accept -> submit -> approve -> redeem conversion for `24h` or `7d` windows.
- Admin funnel alerts endpoint `/api/admin/kpi/funnel/alerts` flags 24h submission/approval/redemption drops against previous 7-day daily baseline.
- Admin approval uses the SQL function `approve_submission` to mark the submission approved and insert reward coins atomically.
- Reward redemption uses the SQL function `redeem_reward` to validate balance and insert a negative wallet transaction atomically.
- Proof submission uploads screenshots into the `submission-screenshots` bucket and stores the uploaded paths on each submission row.
- Admin review page renders storage-backed screenshot previews with signed URLs for secure proof inspection.
- Reel metrics sync currently runs from the dashboard "Sync now" button and writes to `reel_insights`.
