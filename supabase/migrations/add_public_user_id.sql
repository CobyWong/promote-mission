alter table public.profiles
  add column if not exists public_user_id text;

update public.profiles
set public_user_id = 'USR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where public_user_id is null or btrim(public_user_id) = '';

alter table public.profiles
  alter column public_user_id set default ('USR-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)));

alter table public.profiles
  alter column public_user_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_public_user_id_key'
  ) then
    alter table public.profiles
      add constraint profiles_public_user_id_key unique (public_user_id);
  end if;
end $$;

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
