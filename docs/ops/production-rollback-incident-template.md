# Production Rollback Incident Template

Use this template whenever a production rollback is executed.

## 1) Incident Header

- Incident ID:
- Date:
- Timezone:
- Severity:
- Incident Commander:
- Release Owner:
- Rollback Owner:
- Status: Open / Monitoring / Resolved / Follow-up

## 2) Release Context

- Release version or commit SHA:
- Deployment window:
- Services and routes impacted:
- Database migration(s) included:
- Feature flags changed:

## 3) Trigger and Detection

- Trigger type: Error spike / Submission drop / Redemption failures / E2E failure / Other
- Trigger details:
- Detection source: Dashboard / Alerts workflow / Manual verification / User report
- First detection timestamp:
- Alert name (if applicable):

## 4) Impact Assessment

- User impact summary:
- Estimated affected users:
- Submission flow impact:
- Redemption flow impact:
- Admin workflow impact:
- Data integrity risk: None / Low / Medium / High

## 5) Timeline (UTC)

- T0 detected:
- T1 triage started:
- T2 rollback decision:
- T3 rollback started:
- T4 rollback completed:
- T5 verification completed:
- T6 incident resolved:

## 6) Rollback Execution

- Rollback target version/commit:
- Rollback method used:
- Deployment platform action taken:
- DB rollback needed: Yes / No
- DB rollback command or SQL (if used):
- Post-rollback cache/session actions:

## 7) Verification After Rollback

Run and record outputs for:

1. Core health endpoints
2. Admin KPI endpoint
3. Funnel alerts endpoint
4. Staging/production verification scripts (as applicable)

Verification checklist:

- [ ] App health restored
- [ ] Error rate returned to baseline
- [ ] Submission success returned to baseline
- [ ] Redemption success returned to baseline
- [ ] No active critical funnel regression alerts

## 8) Root Cause Summary

- Primary root cause:
- Contributing factors:
- Why pre-release checks did not catch this:

## 9) Corrective and Preventive Actions

- Immediate fixes:
- Follow-up fixes:
- Monitoring/alert updates:
- Test coverage updates:
- Runbook updates:

Action items:

- [ ] Owner / task / due date
- [ ] Owner / task / due date
- [ ] Owner / task / due date

## 10) Communication Log

- Stakeholders notified:
- User-facing communication issued: Yes / No
- External status page updated: Yes / No
- Final resolution message timestamp:

## 11) Sign-off

- Incident Commander sign-off:
- Engineering Lead sign-off:
- Product/Ops sign-off:
- Date closed:
