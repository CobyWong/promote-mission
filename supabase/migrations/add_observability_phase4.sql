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