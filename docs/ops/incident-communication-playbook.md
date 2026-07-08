# Incident Communication Playbook

Use this for customer-facing and internal updates during production incidents.

## Channels

- Internal: engineering chat channel + incident bridge
- External: status page (if available), support inbox, key partner contact list

## Cadence

- Initial acknowledgement: within 10 minutes
- Update cadence during active incident: every 20-30 minutes
- Resolution summary: within 30 minutes after recovery

## Message Templates

### 1) Initial Acknowledgement

"We are investigating elevated errors affecting mission submission/reward workflows. The team is actively working on mitigation. Next update in 30 minutes."

### 2) Mitigation in Progress

"We identified the issue and are applying mitigation, including rollback/safety controls. Some actions may remain delayed while systems stabilize."

### 3) Recovery Confirmed

"Service has recovered and core workflows are operating normally. We are monitoring closely and will share a post-incident summary."

### 4) Post-Incident Summary

- What happened
- Impact window
- User impact
- Corrective actions
- Preventive actions

## Approval Path

- Incident Commander drafts
- Product/Ops approves external wording
- Release owner posts update

## Mandatory Fields For Every Update

- Timestamp (UTC)
- Current status
- Impact scope
- Next update time
