-- Re-enable community level-1 missions
update public.missions
set is_active = true
where slug in ('missionone-funny-moment', 'missionone-sing-cover');

-- Hide the two original level-1 promotional missions
update public.missions
set is_active = false
where slug in ('spark-hydration-bottle', 'fitbyte-protein-chips');
