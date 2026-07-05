# System Implementation Roadmap

## Phase 1 - Referral foundation (in progress)

### Schema changes
- Add `public.referral_profiles`
  - `user_id` (PK, FK -> auth.users)
  - `referral_code` (unique)
  - `created_at`
- Add `public.referrals`
  - `id` (PK)
  - `inviter_user_id` (FK -> auth.users)
  - `invited_user_id` (unique FK -> auth.users)
  - `referral_code_used`
  - `created_at`
- Add indexes for inviter/invited lookups.
- Enable RLS and select policies for owner-scoped reads.
- Add signup trigger `handle_new_user_referral`:
  - create referral profile for each new user
  - resolve `referral_code` from signup metadata
  - create inviter -> invited linkage row

### API endpoints
- `GET /api/referrals/stats`
  - Auth required
  - Returns referral code + invite stats for current user

### UI updates
- Dashboard referral card reads from real backend stats instead of static zeros.
- Keep existing tier display logic on card; backend now feeds actual counts.

### Status
- Implemented in codebase.
- Migration file: `supabase/migrations/add_referral_system_phase1.sql`

---

## Phase 2 - Qualification + payout settlement (implemented)

### Schema changes
- Extend `public.referrals` with:
  - `qualified_at`
  - `first_approved_submission_id`
  - `rewarded_at`
  - `reward_coins`
  - `status` (`Invited`, `Qualified`, `Rewarded`)
- Add `coin_transactions.transaction_type = 'referral_reward'` usage with idempotency keys.

### Backend jobs / logic
- On submission approval, evaluate if invited user reached first approved mission.
- Mark referral as qualified once.
- Settle referral reward once (idempotent write to coin ledger).

### API endpoints
- `POST /api/referrals/recalculate` (admin only)
- `GET /api/referrals/history`

### Status
- Implemented settlement function `settle_referral_reward` and wired it to admin approval flow.
- Implemented `GET /api/referrals/history` endpoint.
- Dashboard now shows referral history timeline and stats based on rewarded settlement state.

### UI updates
- Referral history timeline in dashboard.
- Distinguish pending-qualified-rewarded statuses.

---

## Phase 3 - Mission lifecycle and ops controls

### Schema changes
- Add mission lifecycle fields (`status`, `starts_at`, `ends_at`, `archived_at`).
- Add admin reviewer assignment and SLA fields for submissions.

### API endpoints
- Mission state transitions (brand/admin protected).
- Bulk submission review endpoints.

### UI updates
- Brand mission manager: draft/active/paused/full/ended controls.
- Admin board: bulk approve/reject, filters, SLA badges.

---

## Phase 4 - Notifications and observability

### Schema changes
- Add `notifications` table and delivery state fields.

### API endpoints
- Notification list + mark-as-read.

### UI updates
- Header notification center.
- Event-driven notifications for approvals, redemptions, referral tier unlocks.

### Platform operations
- Add structured logging + error monitoring + KPI dashboard.
- Add integration tests for critical paths.
