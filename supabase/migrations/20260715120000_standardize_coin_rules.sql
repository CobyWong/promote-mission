-- Standardize mission/reward coin rules.
-- Missions: Easy=100, Medium=300, Hard=500.
-- Rewards: for rows with HK$ price in name, required coins = HKD price * 100.

update public.missions
set reward_coins = case
  when lower(difficulty) = 'hard' then 500
  when lower(difficulty) = 'medium' then 300
  else 100
end;

update public.rewards_catalog
set cost = (
  replace((regexp_match(name, 'HK\$\s*([0-9][0-9,]*)'))[1], ',', '')::integer * 100
)
where name ~* 'HK\$\s*[0-9]+';
