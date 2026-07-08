# Backup and Restore Drill Runbook

Run this drill at least once per quarter and after major schema changes.

## Objective

- Validate backup availability.
- Validate restore procedure and timing (RTO/RPO).
- Validate post-restore app health and critical APIs.

## Preconditions

- You have access to Supabase project backups/snapshots.
- You have an isolated drill environment (do not restore into production directly).
- You have admin credentials for validation checks.

## Drill Steps

1. Record start time and drill owner.
2. Identify backup snapshot timestamp.
3. Provision a restore target environment.
4. Restore database from snapshot in target environment.
5. Apply any required post-restore secrets/config.
6. Deploy current app build pointed to restore target.
7. Run verification commands:

    npm run check:env

    STAGING_BASE_URL=https://restore-target-domain.com \
    STAGING_ADMIN_EMAIL=admin@example.com \
    STAGING_ADMIN_PASSWORD='your-admin-password' \
    FAIL_ON_FUNNEL_WARN=0 \
    npm run alerts:funnel

8. Verify key flows manually:
   - mission browse
   - submission create
   - admin approve
   - redemption request
9. Record end time.

## Success Criteria

- Restore target is online and queryable.
- Critical APIs return expected status codes.
- Core mission/review/redemption flows operate normally.
- Measured RTO and RPO are within agreed limits.

## Capture Metrics

- RTO (restore time objective):
- RPO (recovery point objective):
- Data anomalies found:
- Action items:

## Follow-up

- Update runbooks with any corrections.
- Create tickets for drill failures or risky manual steps.
