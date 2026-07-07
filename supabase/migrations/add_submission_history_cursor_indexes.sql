-- Optimize mobile submission history cursor pagination and filtered lookups.
create index if not exists idx_submissions_user_submitted_id_desc
  on public.submissions (user_id, submitted_at desc, id desc);

create index if not exists idx_submissions_user_status_submitted_id_desc
  on public.submissions (user_id, status, submitted_at desc, id desc);
