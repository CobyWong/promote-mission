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