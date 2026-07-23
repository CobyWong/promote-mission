-- Transition to sync-only missions with immediate settlement.
-- Backfill: auto-approve existing pending submissions and credit coins if missing.
-- approve_submission() is idempotent for mission_reward coin transactions.

do $$
declare
  row record;
begin
  for row in
    select id
    from public.submissions
    where status = 'Pending'
  loop
    perform public.approve_submission(row.id, null, 'Auto-approved by sync-only mission flow migration.');
    perform public.settle_referral_reward(row.id);
  end loop;
end;
$$;
