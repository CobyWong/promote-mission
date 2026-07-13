create or replace function public.settle_referral_reward(
  approved_submission_id_input uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_submission public.submissions%rowtype;
  referral_record public.referrals%rowtype;
  first_approved_submission_id_value uuid;
  reward_amount integer := 200;
  existing_reward_tx_id uuid;
begin
  select * into approved_submission
  from public.submissions
  where id = approved_submission_id_input
    and status = 'Approved';

  if not found then
    return jsonb_build_object('settled', false, 'reason', 'submission_not_approved');
  end if;

  select * into referral_record
  from public.referrals
  where invited_user_id = approved_submission.user_id
  limit 1;

  if not found then
    return jsonb_build_object('settled', false, 'reason', 'no_referral');
  end if;

  select s.id into first_approved_submission_id_value
  from public.submissions s
  where s.user_id = approved_submission.user_id
    and s.status = 'Approved'
  order by s.submitted_at asc, s.id asc
  limit 1;

  if first_approved_submission_id_value is null then
    return jsonb_build_object('settled', false, 'reason', 'no_approved_submission');
  end if;

  update public.referrals
  set
    status = case when rewarded_at is not null then 'Rewarded' else 'Qualified' end,
    qualified_at = coalesce(qualified_at, timezone('utc', now())),
    first_approved_submission_id = coalesce(first_approved_submission_id, first_approved_submission_id_value)
  where id = referral_record.id;

  if first_approved_submission_id_value <> approved_submission.id then
    return jsonb_build_object('settled', false, 'reason', 'not_first_approved_submission');
  end if;

  select id into existing_reward_tx_id
  from public.coin_transactions
  where submission_id = first_approved_submission_id_value
    and transaction_type = 'referral_reward'
  limit 1;

  if existing_reward_tx_id is not null then
    update public.referrals
    set
      status = 'Rewarded',
      rewarded_at = coalesce(rewarded_at, timezone('utc', now()))
    where id = referral_record.id;

    return jsonb_build_object('settled', false, 'reason', 'already_rewarded');
  end if;

  insert into public.coin_transactions (
    user_id,
    submission_id,
    amount,
    transaction_type,
    description
  )
  values (
    referral_record.inviter_user_id,
    first_approved_submission_id_value,
    reward_amount,
    'referral_reward',
    concat('Referral reward for invited creator first approved mission: ', approved_submission.mission_title)
  );

  update public.referrals
  set
    status = 'Rewarded',
    qualified_at = coalesce(qualified_at, timezone('utc', now())),
    first_approved_submission_id = first_approved_submission_id_value,
    rewarded_at = timezone('utc', now()),
    reward_coins = reward_amount
  where id = referral_record.id;

  return jsonb_build_object(
    'settled', true,
    'rewardCoins', reward_amount,
    'inviterUserId', referral_record.inviter_user_id,
    'invitedUserId', referral_record.invited_user_id,
    'submissionId', first_approved_submission_id_value
  );
end;
$$;
