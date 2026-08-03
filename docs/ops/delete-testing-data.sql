-- Delete testing data by test account email.
-- Run in Supabase SQL Editor as project owner.
-- This script is destructive. Review the target email list before running.

begin;

create temporary table _target_users on commit drop as
select id, lower(email) as email
from auth.users
where lower(email) in (
  -- Add or remove test account emails here.
  'yinwong101504@gmail.com'
);

-- Preview which users will be deleted.
select id, email
from _target_users;

-- Preview counts before deletion.
-- Some tables may not exist in every environment; missing tables are treated as 0.
create temporary table _preview_counts (
  table_name text primary key,
  row_count bigint not null default 0
) on commit drop;

insert into _preview_counts (table_name)
values
  ('profiles'),
  ('submissions'),
  ('coin_transactions'),
  ('reward_redemptions'),
  ('instagram_connections'),
  ('reel_insights'),
  ('notifications'),
  ('referral_profiles'),
  ('referrals(inviter)'),
  ('referrals(invited)'),
  ('referral_reward_holds(inviter)'),
  ('referral_reward_holds(invited)'),
  ('support_tickets'),
  ('app_logs'),
  ('storage.objects(mission screenshot, manual cleanup)');

do $$
declare
  _spec record;
  _count bigint;
begin
  for _spec in
    select *
    from (
      values
        ('profiles', 'public.profiles', 'id in (select id from _target_users)'),
        ('submissions', 'public.submissions', 'user_id in (select id from _target_users)'),
        ('coin_transactions', 'public.coin_transactions', 'user_id in (select id from _target_users)'),
        ('reward_redemptions', 'public.reward_redemptions', 'user_id in (select id from _target_users)'),
        ('instagram_connections', 'public.instagram_connections', 'user_id in (select id from _target_users)'),
        ('reel_insights', 'public.reel_insights', 'user_id in (select id from _target_users)'),
        ('notifications', 'public.notifications', 'user_id in (select id from _target_users)'),
        ('referral_profiles', 'public.referral_profiles', 'user_id in (select id from _target_users)'),
        ('referrals(inviter)', 'public.referrals', 'inviter_user_id in (select id from _target_users)'),
        ('referrals(invited)', 'public.referrals', 'invited_user_id in (select id from _target_users)'),
        ('referral_reward_holds(inviter)', 'public.referral_reward_holds', 'inviter_user_id in (select id from _target_users)'),
        ('referral_reward_holds(invited)', 'public.referral_reward_holds', 'invited_user_id in (select id from _target_users)'),
        ('support_tickets', 'public.support_tickets', 'user_id in (select id from _target_users)'),
        ('app_logs', 'public.app_logs', 'user_id in (select id from _target_users)'),
        ('storage.objects(mission screenshot, manual cleanup)', 'storage.objects', 'bucket_id = ''mission screenshot'' and split_part(name, ''/'', 1) in (select id::text from _target_users)')
    ) as q(table_name, relation_name, where_sql)
  loop
    if to_regclass(_spec.relation_name) is not null then
      execute format('select count(*) from %s where %s', _spec.relation_name, _spec.where_sql)
        into _count;

      update _preview_counts
      set row_count = _count
      where table_name = _spec.table_name;
    end if;
  end loop;
end $$;

select table_name, row_count
from _preview_counts
order by table_name;

-- Storage objects must be deleted manually (or via Storage API).
-- This shows object paths that match target users.
select name as storage_object_name
from storage.objects
where bucket_id = 'mission screenshot'
  and split_part(name, '/', 1) in (select id::text from _target_users)
order by name;

-- Remove non-cascading rows first.
-- Note: Supabase blocks direct DELETE on storage.objects in SQL Editor.
-- Clean up matching storage files afterward via Storage UI or Storage API.
do $$
declare
  _spec record;
begin
  for _spec in
    select *
    from (
      values
        ('public.support_tickets', 'user_id in (select id from _target_users)'),
        ('public.app_logs', 'user_id in (select id from _target_users)')
    ) as q(relation_name, where_sql)
  loop
    if to_regclass(_spec.relation_name) is not null then
      execute format('delete from %s where %s', _spec.relation_name, _spec.where_sql);
    end if;
  end loop;
end $$;

-- Main delete: this cascades to most user-owned records.
delete from auth.users
where id in (select id from _target_users);

commit;

-- Optional: remove demo seed catalog rows (uncomment only if needed).
-- delete from public.reward_redemptions
-- where reward_slug in (
--   'parknshop-voucher-100',
--   'usdt-50',
--   'airpods-pro',
--   'sony-wh-1000xm5'
-- );
--
-- delete from public.rewards_catalog
-- where slug in (
--   'parknshop-voucher-100',
--   'usdt-50',
--   'airpods-pro',
--   'sony-wh-1000xm5'
-- );
--
-- delete from public.submissions
-- where mission_slug in (
--   'spark-hydration-bottle',
--   'nova-beauty-serum',
--   'fitbyte-protein-chips',
--   'roam-mini-projector',
--   'missionone-funny-moment',
--   'missionone-sing-cover'
-- );
--
-- delete from public.missions
-- where slug in (
--   'spark-hydration-bottle',
--   'nova-beauty-serum',
--   'fitbyte-protein-chips',
--   'roam-mini-projector',
--   'missionone-funny-moment',
--   'missionone-sing-cover'
-- );
