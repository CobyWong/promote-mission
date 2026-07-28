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

    if inviter_id is null then
      raise exception 'Invalid referral code: %', upper(used_referral_code)
        using errcode = '22023';
    end if;

    if inviter_id = new.id then
      raise exception 'You cannot use your own referral code.'
        using errcode = '22023';
    end if;

    insert into public.referrals (inviter_user_id, invited_user_id, referral_code_used)
    values (inviter_id, new.id, upper(used_referral_code))
    on conflict (invited_user_id) do nothing;
  end if;

  return new;
end;
$$;