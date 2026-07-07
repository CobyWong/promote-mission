alter table public.referrals
  add column if not exists referral_stage text not null default 'registered' check (referral_stage in ('invited', 'registered', 'first_submission', 'first_approved', 'reward_pending', 'reward_released')),
  add column if not exists reward_status text not null default 'released' check (reward_status in ('released', 'hold', 'rejected')),
  add column if not exists reward_hold_until timestamptz,
  add column if not exists review_status text not null default 'auto' check (review_status in ('auto', 'pending', 'approved', 'rejected')),
  add column if not exists risk_score integer not null default 0,
  add column if not exists risk_flags text[] not null default '{}',
  add column if not exists reminder_count integer not null default 0,
  add column if not exists last_reminded_at timestamptz,
  add column if not exists campaign_source text,
  add column if not exists campaign_medium text,
  add column if not exists season_key text;

update public.referrals
set referral_stage = case
  when rewarded_at is not null then 'reward_released'
  when qualified_at is not null then 'first_approved'
  else 'registered'
end,
reward_status = case
  when rewarded_at is not null then 'released'
  else reward_status
end,
season_key = coalesce(season_key, to_char(created_at, 'YYYYMM'));

create index if not exists referrals_stage_idx on public.referrals(referral_stage);
create index if not exists referrals_review_status_idx on public.referrals(review_status);
create index if not exists referrals_reward_status_idx on public.referrals(reward_status);
create index if not exists referrals_season_idx on public.referrals(season_key);

create table if not exists public.referral_reward_holds (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null references public.referrals(id) on delete cascade,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  amount integer not null,
  risk_score integer not null default 0,
  risk_flags text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'released', 'rejected')),
  hold_until timestamptz,
  review_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists referral_reward_holds_status_idx on public.referral_reward_holds(status, hold_until);
create index if not exists referral_reward_holds_inviter_idx on public.referral_reward_holds(inviter_user_id, created_at desc);
create index if not exists referral_reward_holds_referral_idx on public.referral_reward_holds(referral_id);

alter table public.referral_reward_holds enable row level security;

update public.referrals
set campaign_source = coalesce(campaign_source, 'direct'),
    campaign_medium = coalesce(campaign_medium, 'code');
