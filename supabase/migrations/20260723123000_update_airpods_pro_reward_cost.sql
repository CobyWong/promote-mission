-- Align AirPods Pro reward cost with current official HK list price.
-- Source checked: Apple Hong Kong store (AirPods Pro listed at HK$1,849 on 2026-07-23).
-- Coins rule: price * 100.
update public.rewards_catalog
set cost = 184900
where slug = 'airpods-pro'
	or lower(name) like 'airpods pro%';
