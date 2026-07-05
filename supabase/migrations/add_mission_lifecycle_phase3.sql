alter table public.missions
  add column if not exists status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'full', 'ended', 'archived')),
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz,
  add column if not exists archived_at timestamptz;

-- Preserve current behavior for existing missions.
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