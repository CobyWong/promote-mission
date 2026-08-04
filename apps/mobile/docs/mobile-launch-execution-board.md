# Mobile Launch Execution Board

## Goal
Ship a production-ready Mission One mobile app for TestFlight/Internal beta with core funnels stable and launch controls in place.

## Current Sprint Focus (Highest-Risk First)
1. Native auth/session hardening
2. Mission flow parity + level lock
3. Offline/bad-network resilience

## Workstream Status

| Area | Priority | Status | Owner | Notes |
|---|---|---|---|---|
| Native auth hardening | P0 | In progress | Engineering | Session restore + auth state sync + server session parity implemented. Biometric lock pending. |
| Mission flow parity | P0 | In progress | Engineering | Mission zone selector + level-gated zones + mission detail lock implemented. |
| Reliable media sync | P0 | In progress | Engineering | Manual proof upload endpoints are disabled; focus moved to missionone_hk sync trigger UX and classification reliability. |
| Push notifications | P0 | Not started | Engineering | Need Expo push token registration + deep links + settings screen. |
| Offline/bad-network | P0 | In progress | Engineering | Mission list cache fallback + submission history cache implemented; sync-state resilience hardening pending. |
| Security hardening | P0 | Not started | Engineering | Secure token storage review, pinning decision, abuse/rate-limit verification. |
| Crash + analytics | P0 | Not started | Engineering | Need Sentry/Crashlytics + funnel event instrumentation. |
| Payments/reward integrity | P0 | In progress | Engineering | Submission idempotency exists; add redeem idempotency + reconciliation checks in mobile UX. |
| QA device matrix | P0 | Not started | QA | Define matrix + timezone/localization real-device plan. |
| Release ops | P0 | Not started | Engineering/Ops | EAS profiles, remote config, rollback switches, app version deprecation logic. |

## Implemented This Sprint

### 1) Auth/session hardening (started)
- Session restored on cold launch and synced to server cookie endpoint.
- Auth state subscription now syncs server session on `SIGNED_IN` and `TOKEN_REFRESHED`.
- Sign out now clears both mobile session and server session endpoint.

### 2) Mission flow parity (started)
- Added mission zone selector in mobile (`Easy`, `Medium`, `Hard`).
- Enforced level lock on mission zones (`Medium` requires Lv.10, `Hard` requires Lv.20).
- Enforced level lock in mission detail sync flow (locked missions cannot run mission sync).

### 3) Offline resilience (started)
- Added local cache fallback for mission list via AsyncStorage with TTL.
- Network failures now keep cached missions visible with clear fallback messaging.
- Added collaborator + hashtag sync guidance in mission detail with system sync trigger.

### 4) Reliable mission sync (started)
- Manual mobile submission endpoint (`POST /api/mobile/submissions`) is disabled.
- Manual upload session endpoints (`/api/mobile/uploads/sessions/**`) are disabled.
- Mission detail now emphasizes collaborator + mission hashtag requirements and uses system sync trigger.

## Next 7 Days Plan
1. Improve sync feedback granularity (matched reels / pending tag mismatch) in mission detail (P0).
2. Add push token registration endpoint and deep-link handling to mission/reward/review screens (P0).
3. Add crash reporting + funnel analytics baseline (P0).
4. Add QA matrix and run first real-device smoke pass (P0).

## Exit Criteria For Beta Readiness
1. Zero P0/P1 in mobile auth, mission, auto-sync, redeem core funnels.
2. Crash-free sessions >99.5% for internal beta.
3. Push + deep links verified on iOS + Android real devices.
4. Rollback tested once for both API and mobile app release.
5. Store assets/privacy disclosures complete and reviewed.
