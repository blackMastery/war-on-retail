-- War on Retail — public storage buckets
-- Run this AFTER you've created buckets in the dashboard, OR uncomment the
-- inserts below to provision them via SQL.

-- insert into storage.buckets (id, name, public)
-- values
--   ('product-images',  'product-images',  true),
--   ('brand-logos',     'brand-logos',     true),
--   ('category-images', 'category-images', true)
-- on conflict (id) do nothing;

-- Public read for the three asset buckets.
drop policy if exists "public read product-images" on storage.objects;
create policy "public read product-images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "public read brand-logos" on storage.objects;
create policy "public read brand-logos"
  on storage.objects for select
  using (bucket_id = 'brand-logos');

drop policy if exists "public read category-images" on storage.objects;
create policy "public read category-images"
  on storage.objects for select
  using (bucket_id = 'category-images');

-- Uploads are performed server-side via the service-role key, so we
-- intentionally do NOT grant insert/update/delete to anon or authenticated.
