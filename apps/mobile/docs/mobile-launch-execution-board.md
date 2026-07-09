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
| Reliable media upload | P0 | In progress | Engineering | Chunked/resumable proof media upload sessions + byte-level queue progress implemented; background transfer continuity hardening still pending. |
| Push notifications | P0 | Not started | Engineering | Need Expo push token registration + deep links + settings screen. |
| Offline/bad-network | P0 | In progress | Engineering | Mission list cache fallback + persistent submission retry queue + background task worker integration implemented. |
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
- Enforced level lock in mission detail submit flow (locked missions cannot submit proof).

### 3) Offline resilience (started)
- Added local cache fallback for mission list via AsyncStorage with TTL.
- Network failures now keep cached missions visible with clear fallback messaging.
- Added persistent proof submission queue with auto retry/backoff and resume on app relaunch.
- Added upload queue UI with per-item progress, retry-now, and remove/clear-completed actions.

### 4) Reliable media upload (started)
- Added mobile upload session APIs for chunked resumable uploads:
	- `POST /api/mobile/uploads/sessions`
	- `GET /api/mobile/uploads/sessions/[uploadId]`
	- `POST /api/mobile/uploads/sessions/[uploadId]/parts/[partNumber]`
	- `POST /api/mobile/uploads/sessions/[uploadId]/complete`
- Added media picker in mobile proof form and persisted media metadata in queue items.
- Queue processor now uploads file chunks with resume support and maps real uploaded bytes into queue progress.
- Added native background upload worker integration with Expo TaskManager/BackgroundFetch so queued uploads continue processing while app is backgrounded.
- Added platform-specific continuous transfer path for large files (>=25MB): native binary chunk uploads use background-capable upload sessions, while task-based queue orchestration remains as fallback/resume.
- Refactored upload completion path to stream part merge via temp file and stream final upload, removing full in-memory `Buffer.concat` merge risk.
- Added admin/cron cleanup endpoint for stale upload sessions and orphan part files:
	- `POST /api/admin/mobile-uploads/cleanup?retentionHours=48`
- Enforced session-level integrity policy:
	- Require full-file checksum at upload session creation and store immutable integrity sidecar (`session.integrity.json`).
	- Verify manifest hash + expected full-file checksum in finalization.
	- Emit tamper-detection audit logs for rejected finalizations.

## Next 7 Days Plan
1. Implement upload progress + retry + resumable queue for proof uploads (P0).
2. Add push token registration endpoint and deep-link handling to mission/reward/review screens (P0).
3. Add crash reporting + funnel analytics baseline (P0).
4. Add QA matrix and run first real-device smoke pass (P0).

## Exit Criteria For Beta Readiness
1. Zero P0/P1 in mobile auth, mission, submit, redeem core funnels.
2. Crash-free sessions >99.5% for internal beta.
3. Push + deep links verified on iOS + Android real devices.
4. Rollback tested once for both API and mobile app release.
5. Store assets/privacy disclosures complete and reviewed.
