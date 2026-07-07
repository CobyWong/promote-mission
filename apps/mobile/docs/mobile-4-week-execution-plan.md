# Mission One Mobile - 4 Week Execution Plan

## Goal
Ship a production-ready v1 mobile app (Expo) with stable auth, mission workflows, rewards/referral visibility, observability, and release readiness.

## Week 1 - Foundations and Reliability
### Outcome
A stable mobile base with consistent UI tokens, resilient API layer, and session lifecycle handling.

### PR slices
1. PR-W1-01: Mobile UI foundations
- Add mobile typography/spacing/tap-target tokens.
- Apply tokens to app shell and key cards/buttons.
- Standardize min tap size to 44px.

2. PR-W1-02: API reliability baseline
- Add request timeout and retry policy for idempotent GET requests.
- Normalize API error shape for UI rendering.
- Add explicit unauthenticated error handling path.

3. PR-W1-03: Session lifecycle hardening
- Restore session on cold launch.
- Subscribe to auth state changes and update token/profile.
- Add sign-out cleanup parity.

4. PR-W1-04: QA and docs
- Update mobile README for env/run/known limits.
- Add manual test checklist for auth + mission list/detail.

## Week 2 - Core Product Flows (User Value)
### Outcome
Users can complete meaningful end-to-end tasks on mobile.

### PR slices
1. PR-W2-01: Mission detail UX and loading states.
2. PR-W2-02: Proof submission flow (form + upload state + API integration).
3. PR-W2-03: Profile/dashboard summary (coins, approvals, pending).
4. PR-W2-04: Rewards browse and redemption request trigger.

## Week 3 - Growth, Notifications, and Offline UX
### Outcome
Mobile app supports engagement loops and degrades gracefully.

### PR slices
1. PR-W3-01: Referral center mobile screen (stats/history/share CTA).
2. PR-W3-02: Push notification setup and deep-link routing.
3. PR-W3-03: Offline/poor-network UX (retry, cached last-success list).
4. PR-W3-04: Analytics events for core funnels.

## Week 4 - Release Readiness and Store Prep
### Outcome
App is ready for preview/prod rollout and store submission.

### PR slices
1. PR-W4-01: EAS profiles + CI build scripts.
2. PR-W4-02: Crash/error reporting integration.
3. PR-W4-03: Store assets + privacy/data safety docs.
4. PR-W4-04: Release checklist and go/no-go signoff.

## Definition of Done (v1)
- Auth/session stable across app restarts and token refresh.
- Mission list/detail/submission/reward core paths usable on mobile.
- All primary actions reachable with 44px tap targets.
- Build profiles produce installable preview/prod binaries.
- Monitoring in place: API failures, crashes, basic funnel metrics.
