-- Remove demo seed content from missions and rewards catalogs.
-- Safe to run multiple times.

delete from public.reward_redemptions
where reward_slug in (
  'parknshop-voucher-100',
  'usdt-50',
  'airpods-pro',
  'sony-wh-1000xm5'
);

delete from public.rewards_catalog
where slug in (
  'parknshop-voucher-100',
  'usdt-50',
  'airpods-pro',
  'sony-wh-1000xm5'
);

delete from public.submissions
where mission_slug in (
  'spark-hydration-bottle',
  'nova-beauty-serum',
  'fitbyte-protein-chips',
  'roam-mini-projector',
  'missionone-funny-moment',
  'missionone-sing-cover'
);

delete from public.missions
where slug in (
  'spark-hydration-bottle',
  'nova-beauty-serum',
  'fitbyte-protein-chips',
  'roam-mini-projector',
  'missionone-funny-moment',
  'missionone-sing-cover'
);
