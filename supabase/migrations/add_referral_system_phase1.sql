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

insert into public.referral_profiles (user_id, referral_code)
select u.id, upper(substring(md5(u.id::text) from 1 for 8))
from auth.users u
left join public.referral_profiles rp on rp.user_id = u.id
where rp.user_id is null
on conflict (user_id) do nothing;
