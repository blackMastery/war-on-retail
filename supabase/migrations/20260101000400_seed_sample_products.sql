-- War on Retail — sample products
-- A handful of representative products so the storefront renders before
-- you've finished cataloguing your real inventory. Prices are in GYD.
-- Replace these with your real data via the admin CSV upload.

insert into public.products (
  name, slug, sku, price, compare_at_price, stock_quantity,
  short_description, description,
  category_id, brand_id,
  featured_image_url, image_urls,
  specifications, is_featured
)
select
  p.name, p.slug, p.sku, p.price, p.compare_at_price, p.stock_quantity,
  p.short_description, p.description,
  cat.id, br.id,
  p.featured_image_url, p.image_urls,
  p.specifications::jsonb, p.is_featured
from (values
  ('Samsung 55" 4K Smart TV', 'samsung-55-4k-smart-tv', 'SAMS-TV-55-4K-001',
   325000, 365000, 12,
   'Crystal-clear 4K resolution with Tizen smart features.',
   'Experience stunning picture quality with this Samsung 55-inch 4K UHD Smart TV. Built-in streaming apps, voice remote, and HDR for vivid color.',
   'televisions', 'samsung',
   null, array[]::text[],
   '{"screen_size":"55 inches","resolution":"4K UHD","smart":true,"hdr":true}',
   true),

  ('LG 2-Door Top-Freezer Refrigerator 18 cu ft', 'lg-2-door-top-freezer-18cuft', 'LG-REF-18-TF-001',
   215000, 235000, 6,
   'Spacious 18 cu ft top-freezer with Smart Inverter Compressor.',
   'Reliable LG top-freezer refrigerator with multi-air-flow cooling and a 10-year compressor warranty.',
   'refrigerators', 'lg',
   null, array[]::text[],
   '{"capacity_cu_ft":18,"door_style":"top_freezer","color":"silver"}',
   true),

  ('Sony WH-1000XM5 Wireless Headphones', 'sony-wh-1000xm5', 'SONY-AUD-WH1000XM5',
   135000, 149000, 20,
   'Industry-leading noise cancellation with 30-hour battery.',
   'Sony WH-1000XM5 delivers exceptional noise cancellation, multipoint Bluetooth, and crystal-clear hands-free calls.',
   'audio-systems', 'sony',
   null, array[]::text[],
   '{"battery_hours":30,"bluetooth":"5.2","noise_cancellation":true,"color":"black"}',
   false),

  ('HP Pavilion 15.6" Laptop — i5 / 16GB / 512GB', 'hp-pavilion-15-i5-16-512', 'HP-LT-PAV15-i5-16-512',
   285000, null, 4,
   'Everyday performance for work and study, Windows 11.',
   '12th-gen Intel Core i5, 16 GB RAM, 512 GB NVMe SSD, full-HD display. Comes with a 1-year manufacturer warranty.',
   'laptops', 'hp',
   null, array[]::text[],
   '{"cpu":"Intel i5-1235U","ram_gb":16,"storage_gb":512,"screen":"15.6 FHD"}',
   true),

  ('Panasonic 1.6 cu ft Microwave Oven', 'panasonic-microwave-1-6', 'PAN-MW-16-001',
   42000, null, 18,
   'Inverter technology for even heating across the plate.',
   'Compact countertop microwave with sensor cooking and a clean stainless finish.',
   'microwaves', 'panasonic',
   null, array[]::text[],
   '{"capacity_cu_ft":1.6,"wattage":1250,"color":"stainless"}',
   false),

  ('Philips Series 5000 Shaver', 'philips-shaver-5000', 'PHIL-SHV-5000',
   28500, 32000, 25,
   'ComfortCut blades and a precision trimmer in one.',
   'Wet & dry electric shaver with 60 minutes of cordless use per 1-hour charge.',
   'shavers', 'philips',
   null, array[]::text[],
   '{"runtime_minutes":60,"wet_dry":true,"trimmer":true}',
   false)
) as p(
  name, slug, sku, price, compare_at_price, stock_quantity,
  short_description, description,
  category_slug, brand_slug,
  featured_image_url, image_urls,
  specifications, is_featured
)
join public.categories cat on cat.slug = p.category_slug
join public.brands     br  on br.slug  = p.brand_slug
on conflict (slug) do nothing;
