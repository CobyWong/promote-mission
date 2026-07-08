create table if not exists public.idempotency_keys (
  storage_key text primary key,
  namespace text not null,
  actor_id uuid references auth.users(id) on delete cascade,
  idempotency_key_hash text not null,
  phase text not null check (phase in ('pending', 'done')),
  response_status integer,
  response_body jsonb,
  backend text not null check (backend in ('database', 'redis', 'memory')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null
);

create index if not exists idempotency_keys_namespace_actor_idx
  on public.idempotency_keys(namespace, actor_id, updated_at desc);

create index if not exists idempotency_keys_expires_idx
  on public.idempotency_keys(expires_at);
