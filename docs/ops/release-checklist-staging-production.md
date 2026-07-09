# Release Checklist: Staging and Production

Use this runbook line-by-line. Stop immediately if any gate fails.

## 0) Pre-flight (once per release)

1. Confirm branch is up to date and clean enough to release.
2. Confirm required secrets are configured in deploy platform and GitHub Actions.
3. Confirm release owner and rollback owner are on-call.

Required environment variables and secrets:

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- ADMIN_EMAILS
- ADMIN_PASSWORD
- RATE_LIMIT_SALT
- CLEANUP_CRON_TOKEN
- FUNNEL_ALERT_SUBMISSION_DROP_PCT
- FUNNEL_ALERT_APPROVE_DROP_PCT
- FUNNEL_ALERT_REDEEM_DROP_PCT

Required GitHub secrets for scheduled/manual workflows:

- CLEANUP_ENDPOINT_URL
- CLEANUP_CRON_TOKEN
- STAGING_BASE_URL
- STAGING_ADMIN_EMAIL
- STAGING_ADMIN_PASSWORD
- STAGING_BEARER_TOKEN (for authenticated mobile smoke checks)
- PROD_BASE_URL (for production mobile smoke workflow)
- PROD_MOBILE_BEARER_TOKEN (for authenticated production mobile smoke checks)
- MOBILE_SMOKE_ALERT_WEBHOOK_URL (optional; receives failure alerts from mobile smoke workflow)

## 1) Local quality gate

Run these commands in order:

    npm run check:env
    npm run lint
    npm run typecheck
    npm run mobile:typecheck
    npm run test
    npm run build

Gate:

- All commands must pass with exit code 0.

## 2) Staging rollout checklist

### 2.1 Deploy to staging

1. Merge release PR to main.
2. Trigger staging deploy from CI/CD platform.
3. Wait until deployment is healthy.

### 2.2 Apply database migrations on staging

Use your standard migration command for staging (Supabase CLI or SQL editor).

If using Supabase CLI:

    supabase db push --linked

Gate:

- Migration includes idempotency keys table and completes without errors.

### 2.3 Staging verification commands

Run in order:

    STAGING_BASE_URL=https://your-staging-domain.com \
    MOBILE_SMOKE_BASE_URL=https://your-staging-domain.com \
    MOBILE_SMOKE_BEARER_TOKEN='optional-mobile-user-jwt' \
    npm run verify:mobile:smoke

    STAGING_BASE_URL=https://your-staging-domain.com \
    STAGING_ADMIN_EMAIL=admin@example.com \
    STAGING_ADMIN_PASSWORD='your-admin-password' \
    STAGING_BEARER_TOKEN='optional-mobile-user-jwt' \
    npm run verify:staging

    STAGING_BASE_URL=https://your-staging-domain.com \
    STAGING_ADMIN_EMAIL=admin@example.com \
    STAGING_ADMIN_PASSWORD='your-admin-password' \
    FAIL_ON_FUNNEL_WARN=0 \
    npm run alerts:funnel

    E2E_BASE_URL=https://your-staging-domain.com \
    E2E_USER_ACCESS_TOKEN='user-access-token' \
    E2E_USER_REFRESH_TOKEN='user-refresh-token' \
    E2E_ADMIN_EMAIL=admin@example.com \
    E2E_ADMIN_PASSWORD='your-admin-password' \
    E2E_MISSION_SLUG='pulse-active-home-workout' \
    E2E_REWARD_SLUG='parknshop-voucher-100' \
    npm run test:e2e:web

Optional strict redeem gate:

    E2E_BASE_URL=https://your-staging-domain.com \
    E2E_USER_ACCESS_TOKEN='user-access-token' \
    E2E_USER_REFRESH_TOKEN='user-refresh-token' \
    E2E_ADMIN_EMAIL=admin@example.com \
    E2E_ADMIN_PASSWORD='your-admin-password' \
    E2E_MISSION_SLUG='pulse-active-home-workout' \
    E2E_REWARD_SLUG='parknshop-voucher-100' \
    npm run test:e2e:web:strict

### 2.4 Staging UI/API verification

1. Open admin dashboard and verify KPI sections render:
   - funnel counts
   - funnel conversion percentages
   - mini sparkline per funnel stage
   - trend direction badge (up/down/flat)
   - funnel regression alerts panel
2. Verify API endpoints:
   - GET /api/admin/kpi
   - GET /api/admin/kpi/trends?range=24h
   - GET /api/admin/kpi/funnel?range=24h
   - GET /api/admin/kpi/funnel/alerts
3. Trigger workflow manually if needed:
   - Funnel Alerts workflow
   - Idempotency Cleanup workflow
    - Mobile Smoke workflow

Mobile Smoke automation:

- `.github/workflows/mobile-smoke.yml` runs every 2 hours (staging target).
- On failure it emits a standardized "Mobile Smoke Alert" summary with runbook and incident-comms references.

Staging go/no-go:

- GO if all checks pass and no critical funnel alerts.
- NO-GO if strict E2E fails, migrations fail, or 5xx/error rates spike.

## 3) Production rollout checklist

### 3.1 Pre-deploy freeze

1. Announce release window and freeze non-essential merges.
2. Confirm rollback procedure and previous stable commit hash.

### 3.2 Deploy production

1. Trigger production deploy.
2. Apply production DB migrations.
3. Confirm deployment health from platform logs.

### 3.3 Production verification commands

Run in order against production with production-safe credentials:

Preferred command (interactive checkpoints + fail-fast):

    PROD_BASE_URL=https://your-production-domain.com \
    PROD_ADMIN_EMAIL=admin@example.com \
    PROD_ADMIN_PASSWORD='your-admin-password' \
    PROD_MOBILE_BEARER_TOKEN='prod-safe-test-user-access-token' \
    E2E_BASE_URL=https://your-production-domain.com \
    E2E_USER_ACCESS_TOKEN='prod-safe-test-user-access-token' \
    E2E_USER_REFRESH_TOKEN='prod-safe-test-user-refresh-token' \
    E2E_ADMIN_EMAIL=admin@example.com \
    E2E_ADMIN_PASSWORD='your-admin-password' \
    E2E_MISSION_SLUG='pulse-active-home-workout' \
    E2E_REWARD_SLUG='parknshop-voucher-100' \
    FAIL_ON_FUNNEL_WARN=0 \
    npm run release:gate:production

Optional standalone mobile smoke check:

    MOBILE_SMOKE_BASE_URL=https://your-production-domain.com \
    MOBILE_SMOKE_BEARER_TOKEN='prod-safe-test-user-access-token' \
    npm run verify:mobile:smoke

    STAGING_BASE_URL=https://your-production-domain.com \
    STAGING_ADMIN_EMAIL=admin@example.com \
    STAGING_ADMIN_PASSWORD='your-admin-password' \
    FAIL_ON_FUNNEL_WARN=0 \
    npm run alerts:funnel

If you run live E2E in production, use a dedicated test user and safe reward slug:

    E2E_BASE_URL=https://your-production-domain.com \
    E2E_USER_ACCESS_TOKEN='user-access-token' \
    E2E_USER_REFRESH_TOKEN='user-refresh-token' \
    E2E_ADMIN_EMAIL=admin@example.com \
    E2E_ADMIN_PASSWORD='your-admin-password' \
    E2E_MISSION_SLUG='pulse-active-home-workout' \
    E2E_REWARD_SLUG='parknshop-voucher-100' \
    npm run test:e2e:web

### 3.4 Post-deploy monitoring window (30 minutes)

Monitor:

- app_logs error level volume
- funnel regression alerts endpoint
- rate-limited and idempotency replay/inflight spikes
- submission create and redemption success rates

Production rollback triggers:

- Error rate > 2x baseline for 10 minutes.
- Submission success drops below 90%.
- Redemption failures > 5% sustained.

Rollback action:

1. Revert deployment to previous stable release.
2. Keep read-only checks active.
3. Open incident note with timeline and failed gate.

## 4) Close-out

1. Record release result (GO/NO-GO, timestamps, owner).
2. Capture funnel metrics snapshot for 24h baseline.
3. Adjust funnel alert thresholds after 2-3 days if noisy.
