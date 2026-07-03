alter table public.missions
  add column if not exists mission_image_url text;

-- Bucket for mission product photos uploaded by brand/admin
insert into storage.buckets (id, name, public)
values ('mission-product-images', 'mission-product-images', true)
on conflict (id) do nothing;
