create extension if not exists "pgcrypto";

create table if not exists public.missions (
  slug text primary key,
  title text not null,
  brand text not null,
  product text not null,
  mission_image_url text,
  reward_coins integer not null,
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  eta text not null,
  category text not null,
  description text not null,
  hook text not null,
  requirements text[] not null default '{}',
  deliverables text[] not null default '{}',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  display_order integer not null default 0,
  min_participants integer not null default 0,
  current_participants integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.rewards_catalog (
  slug text primary key,
  name text not null,
  cost integer not null,
  badge text,
  description text not null,
  fulfillment_eta text not null default '1-3 個工作天',
  stock integer,
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  public_user_id text not null unique default ('USR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  full_name text,
  instagram_handle text,
  niche text,
  followers_range text,
  portfolio_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_name text,
  creator_handle text,
  mission_slug text not null,
  mission_title text not null,
  mission_brand text not null,
  reward_coins integer not null,
  reel_url text not null,
  caption_summary text,
  notes text,
  checklist jsonb,
  screenshot_paths jsonb not null default '[]'::jsonb,
  screenshot_count integer not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Needs edits')),
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  amount integer not null,
  transaction_type text not null default 'mission_reward',
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.instagram_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  instagram_user_id text not null,
  instagram_username text,
  facebook_page_name text,
  access_token text not null,
  token_expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'revoked', 'error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reel_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete set null,
  media_id text not null,
  reel_url text not null,
  metric_date date not null,
  plays integer not null default 0,
  reach integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  shares integer not null default 0,
  saves integer not null default 0,
  total_interactions integer not null default 0,
  raw_metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_slug text not null references public.rewards_catalog(slug),
  reward_name text not null,
  cost_coins integer not null,
  status text not null default 'Pending' check (status in ('Pending', 'Fulfilled', 'Rejected')),
  notes text,
  fulfilled_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  email text not null,
  category text not null default 'General',
  message text not null,
  page_path text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- Create storage bucket for mission screenshots (if it doesn't already exist)
-- Note: This is handled by Supabase automatically, but we include it for completeness
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('mission screenshot', 'mission screenshot', false);
exception when unique_violation then
  -- Bucket already exists, ignore
  null;
end $$;

do $$
begin
  insert into storage.buckets (id, name, public)
  values ('mission-product-images', 'mission-product-images', true);
exception when unique_violation then
  -- Bucket already exists, ignore
  null;
end $$;

create unique index if not exists missions_display_order_idx
  on public.missions(display_order);

create unique index if not exists rewards_display_order_idx
  on public.rewards_catalog(display_order);

create unique index if not exists reel_insights_unique_daily
  on public.reel_insights(user_id, media_id, metric_date);

alter table public.profiles enable row level security;
alter table public.missions enable row level security;
alter table public.rewards_catalog enable row level security;
alter table public.submissions enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.support_tickets enable row level security;
alter table public.instagram_connections enable row level security;
alter table public.reel_insights enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, instagram_handle, niche, followers_range, portfolio_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'instagram_handle',
    new.raw_user_meta_data ->> 'niche',
    new.raw_user_meta_data ->> 'followers_range',
    new.raw_user_meta_data ->> 'portfolio_url'
  )
  on conflict (id) do update
  set
    public_user_id = coalesce(public.profiles.public_user_id, excluded.public_user_id),
    full_name = excluded.full_name,
    instagram_handle = excluded.instagram_handle,
    niche = excluded.niche,
    followers_range = excluded.followers_range,
    portfolio_url = excluded.portfolio_url,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.approve_submission(
  submission_id_input uuid,
  reviewer_id_input uuid default null,
  review_notes_input text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  submission_record public.submissions%rowtype;
begin
  select * into submission_record
  from public.submissions
  where id = submission_id_input;

  if not found then
    raise exception 'Submission not found';
  end if;

  update public.submissions
  set
    status = 'Approved',
    notes = coalesce(review_notes_input, notes),
    reviewed_at = timezone('utc', now()),
    reviewed_by = reviewer_id_input
  where id = submission_id_input;

  -- Only insert coin transaction if one doesn't already exist for this submission
  insert into public.coin_transactions (user_id, submission_id, amount, transaction_type, description)
  select
    submission_record.user_id,
    submission_record.id,
    submission_record.reward_coins,
    'mission_reward',
    concat('Reward for mission ', submission_record.mission_title)
  where not exists (
    select 1 from public.coin_transactions
    where submission_id = submission_record.id
    and transaction_type = 'mission_reward'
  );
end;
$$;

create or replace function public.redeem_reward(
  reward_slug_input text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reward_record public.rewards_catalog%rowtype;
  viewer_id uuid;
  current_balance integer;
  redemption_id uuid;
begin
  viewer_id := auth.uid();

  if viewer_id is null then
    raise exception 'Authentication required';
  end if;

  select * into reward_record
  from public.rewards_catalog
  where slug = reward_slug_input and is_active = true;

  if not found then
    raise exception 'Reward not found';
  end if;

  if reward_record.stock is not null and reward_record.stock <= 0 then
    raise exception 'Reward out of stock';
  end if;

  select coalesce(sum(amount), 0) into current_balance
  from public.coin_transactions
  where user_id = viewer_id;

  if current_balance < reward_record.cost then
    raise exception 'Insufficient Coins';
  end if;

  insert into public.reward_redemptions (user_id, reward_slug, reward_name, cost_coins, status)
  values (viewer_id, reward_record.slug, reward_record.name, reward_record.cost, 'Pending')
  returning id into redemption_id;

  insert into public.coin_transactions (user_id, amount, transaction_type, description)
  values (
    viewer_id,
    reward_record.cost * -1,
    'reward_redemption',
    concat('Redeemed reward ', reward_record.name)
  );

  if reward_record.stock is not null then
    update public.rewards_catalog
    set stock = greatest(stock - 1, 0)
    where slug = reward_record.slug;
  end if;

  return redemption_id;
end;
$$;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "missions are readable" on public.missions;
create policy "missions are readable" on public.missions
  for select using (true);

drop policy if exists "rewards catalog is readable" on public.rewards_catalog;
create policy "rewards catalog is readable" on public.rewards_catalog
  for select using (true);

drop policy if exists "submissions select own" on public.submissions;
create policy "submissions select own" on public.submissions
  for select using (auth.uid() = user_id);

drop policy if exists "submissions insert own" on public.submissions;
create policy "submissions insert own" on public.submissions
  for insert with check (auth.uid() = user_id);

drop policy if exists "coin transactions select own" on public.coin_transactions;
create policy "coin transactions select own" on public.coin_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "reward redemptions select own" on public.reward_redemptions;
create policy "reward redemptions select own" on public.reward_redemptions
  for select using (auth.uid() = user_id);

drop policy if exists "reward redemptions insert own" on public.reward_redemptions;
create policy "reward redemptions insert own" on public.reward_redemptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "instagram connections select own" on public.instagram_connections;
create policy "instagram connections select own" on public.instagram_connections
  for select using (auth.uid() = user_id);

drop policy if exists "instagram connections insert own" on public.instagram_connections;
create policy "instagram connections insert own" on public.instagram_connections
  for insert with check (auth.uid() = user_id);

drop policy if exists "instagram connections update own" on public.instagram_connections;
create policy "instagram connections update own" on public.instagram_connections
  for update using (auth.uid() = user_id);

drop policy if exists "reel insights select own" on public.reel_insights;
create policy "reel insights select own" on public.reel_insights
  for select using (auth.uid() = user_id);

drop policy if exists "reel insights insert own" on public.reel_insights;
create policy "reel insights insert own" on public.reel_insights
  for insert with check (auth.uid() = user_id);

drop policy if exists "reel insights update own" on public.reel_insights;
create policy "reel insights update own" on public.reel_insights
  for update using (auth.uid() = user_id);

drop policy if exists "submission screenshots select own" on storage.objects;
create policy "submission screenshots select own" on storage.objects
  for select using (bucket_id = 'mission screenshot' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "submission screenshots insert own" on storage.objects;
create policy "submission screenshots insert own" on storage.objects
  for insert with check (bucket_id = 'mission screenshot' and auth.uid()::text = (storage.foldername(name))[1]);

create table if not exists public.referral_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  referral_code text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invited_user_id uuid not null unique references auth.users(id) on delete cascade,
  referral_code_used text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists referrals_inviter_idx on public.referrals(inviter_user_id);
create index if not exists referrals_invited_idx on public.referrals(invited_user_id);

alter table public.referral_profiles enable row level security;
alter table public.referrals enable row level security;

drop policy if exists "Users can read own referral profile" on public.referral_profiles;
create policy "Users can read own referral profile"
  on public.referral_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read own referrals" on public.referrals;
create policy "Users can read own referrals"
  on public.referrals
  for select
  using (auth.uid() = inviter_user_id or auth.uid() = invited_user_id);

create or replace function public.handle_new_user_referral()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_code text;
  used_referral_code text;
  inviter_id uuid;
begin
  generated_code := upper(substring(md5(new.id::text) from 1 for 8));

  insert into public.referral_profiles (user_id, referral_code)
  values (new.id, generated_code)
  on conflict (user_id) do nothing;

  used_referral_code := nullif(trim(new.raw_user_meta_data ->> 'referral_code'), '');

  if used_referral_code is not null then
    select rp.user_id into inviter_id
    from public.referral_profiles rp
    where upper(rp.referral_code) = upper(used_referral_code)
    limit 1;

    if inviter_id is not null and inviter_id <> new.id then
      insert into public.referrals (inviter_user_id, invited_user_id, referral_code_used)
      values (inviter_id, new.id, upper(used_referral_code))
      on conflict (invited_user_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_referral on auth.users;
create trigger on_auth_user_created_referral
  after insert on auth.users
  for each row execute procedure public.handle_new_user_referral();

alter table public.referrals
  add column if not exists status text not null default 'Invited' check (status in ('Invited', 'Qualified', 'Rewarded')),
  add column if not exists qualified_at timestamptz,
  add column if not exists first_approved_submission_id uuid references public.submissions(id) on delete set null,
  add column if not exists rewarded_at timestamptz,
  add column if not exists reward_coins integer,
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

create index if not exists referrals_status_idx on public.referrals(status);
create index if not exists referrals_first_approved_submission_idx on public.referrals(first_approved_submission_id);
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

create unique index if not exists coin_transactions_referral_reward_submission_idx
  on public.coin_transactions(submission_id)
  where transaction_type = 'referral_reward' and submission_id is not null;

alter table public.missions
  add column if not exists status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'full', 'ended', 'archived')),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists archived_at timestamptz;

update public.missions
set status = case
  when is_active then 'active'
  else 'paused'
end
where status = 'draft';

create index if not exists missions_status_idx on public.missions(status);
create index if not exists missions_active_window_idx on public.missions(starts_at, ends_at);

alter table public.submissions
  add column if not exists assigned_reviewer_id uuid references auth.users(id) on delete set null,
  add column if not exists review_due_at timestamptz,
  add column if not exists sla_breached_at timestamptz;

create index if not exists submissions_review_due_idx on public.submissions(review_due_at);

create table if not exists public.app_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null check (level in ('debug', 'info', 'warn', 'error')),
  category text not null,
  event text not null,
  message text,
  route text,
  request_id text,
  user_id uuid references auth.users(id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists app_logs_created_idx on public.app_logs(created_at desc);
create index if not exists app_logs_level_created_idx on public.app_logs(level, created_at desc);
create index if not exists app_logs_category_created_idx on public.app_logs(category, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'submission_approved',
    'submission_needs_edits',
    'redemption_requested',
    'redemption_fulfilled',
    'redemption_rejected',
    'referral_reward',
    'system'
  )),
  title text not null,
  message text not null,
  link text,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  delivery_status text not null default 'in_app' check (delivery_status in ('in_app', 'email_queued', 'email_sent', 'email_failed')),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, is_read) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "notifications select own" on public.notifications;
create policy "notifications select own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications
  for update using (auth.uid() = user_id);

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
  inviter_referral_count integer;
  reward_amount integer;
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

  select count(*) into inviter_referral_count
  from public.referrals
  where inviter_user_id = referral_record.inviter_user_id;

  reward_amount := case
    when inviter_referral_count >= 20 then 800
    when inviter_referral_count >= 10 then 500
    else 300
  end;

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
