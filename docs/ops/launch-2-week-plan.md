# 2-Week Launch Execution Plan

This plan is execution-ready and tied to current production hardening work.

## Week 1

### Day 1-2: Release Governance and Freeze Process

Status: completed in this batch

- [x] Create a release checklist with owner, go/no-go criteria, and rollback gates.
- [x] Define freeze window and communication cadence.
- [x] Require pre-release validation: check:env, lint, typecheck, mobile:typecheck, test, build.

Release checklist:

1. Confirm migration files and rollback SQL are reviewed.
2. Confirm staging deploy and smoke checks passed.
3. Confirm alerts are active for API errors and abuse spikes.
4. Confirm data retention cleanup job is green.
5. Confirm production change window and owner on-call.
6. Execute production deploy and verify KPI endpoints.
7. Monitor 30 minutes with rollback trigger thresholds.

Rollback triggers:

- Error rate > 2x baseline for 10 minutes.
- Submission success rate drops below 90%.
- Redemption failure rate > 5%.

### Day 3-4: Funnel Analytics Baseline

Status: completed in this batch

- [x] Instrument funnel events for mission accept, submission created, submission approved, redemption requested.
- [x] Add admin API to read funnel counts and conversion rates.

Operational query endpoint:

- GET /api/admin/kpi/funnel?range=24h
- GET /api/admin/kpi/funnel?range=7d

### Day 5: Alerts and Dashboard Wiring

Status: planned

- [ ] Add alert thresholds to paging channel for submission/redeem regressions.
- [ ] Wire funnel endpoint into admin KPI panel.
- [ ] Add daily trend export for growth review.

## Week 2

### Day 6-7: E2E Smoke Coverage

Status: planned

- [ ] Add web smoke tests: login -> mission accept -> submit -> admin approve.
- [ ] Add redemption smoke test: redeem path + pending status.

### Day 8-9: Security and Resilience

Status: planned

- [ ] Add dependency audit cadence and secret rotation checklist.
- [ ] Run backup restore drill and document RTO/RPO.

### Day 10: Pilot Gate and Production Ramp

Status: planned

- [ ] Run limited cohort launch.
- [ ] Compare funnel metrics vs baseline.
- [ ] Proceed to full rollout if thresholds are met.

## Owner Matrix

- Release owner: Engineering lead
- Approval owner: Product + Ops
- Rollback owner: On-call engineer
- KPI monitoring owner: Operations

## Immediate Next Implementation Items

1. Add funnel cards to admin KPI UI.
2. Add alerting policy docs and webhook integration for funnel thresholds.
3. Add E2E smoke test harness for web + mobile critical paths.
