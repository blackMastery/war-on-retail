-- War on Retail — admin-editable SEO metadata
--
-- Brings four search-relevant surfaces under admin control:
--   (a) products: meta_keywords + per-image metadata (alt/caption/keywords)
--   (b) categories: meta_title/description/keywords
--   (c) brands: meta_title/description/keywords
--   (d) page_seo: one row per static customer route, so the admin can override
--       title/description/keywords/robots without a redeploy

-- ---------------------------------------------------------------------------
-- (a) Products
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists meta_keywords text;

-- Per-image metadata, looked up by URL:
--   { "<image-url>": { "alt": string|null,
--                       "caption": string|null,
--                       "keywords": string|null } }
-- Keyed by URL (not array index) so reordering / deleting from `image_urls`
-- doesn't break the lookup. Orphans are harmless and get garbage-collected
-- the next time the admin saves the row.
alter table public.products
  add column if not exists image_meta jsonb not null default '{}'::jsonb;

-- The featured image lives in its own `featured_image_url` column rather
-- than inside `image_urls[]`, so its alt text gets a sibling column too —
-- keeps lookups consistent on the customer side (no special-casing).
alter table public.products
  add column if not exists featured_image_alt text;

-- ---------------------------------------------------------------------------
-- (b) Categories
-- ---------------------------------------------------------------------------

alter table public.categories
  add column if not exists meta_title       text,
  add column if not exists meta_description text,
  add column if not exists meta_keywords    text;

-- ---------------------------------------------------------------------------
-- (c) Brands
-- ---------------------------------------------------------------------------

alter table public.brands
  add column if not exists meta_title       text,
  add column if not exists meta_description text,
  add column if not exists meta_keywords    text;

-- ---------------------------------------------------------------------------
-- (d) page_seo — one row per static customer route
-- ---------------------------------------------------------------------------

create table if not exists public.page_seo (
  id               text primary key,           -- 'home', 'about', 'policies-privacy'
  path             text not null unique,       -- '/', '/about', '/policies/privacy'
  label            text not null,              -- 'Home', 'About', 'Privacy Policy'
  meta_title       text,
  meta_description text,
  meta_keywords    text,
  robots_index     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.page_seo;
create trigger set_updated_at before update on public.page_seo
  for each row execute function public.set_updated_at();

alter table public.page_seo enable row level security;

-- Page metadata is what customer pages render in their `<head>` — public.
drop policy if exists "public read page_seo" on public.page_seo;
create policy "public read page_seo"
  on public.page_seo for select
  using (true);

-- Seed the 17 customer routes that currently have hard-coded metadata.
-- `robots_index` defaults to false for routes that contain user-private state
-- (cart, wishlist, checkout, checkout/success, search results).
insert into public.page_seo (id, path, label, robots_index) values
  ('home',              '/',                   'Home',             true),
  ('products',          '/products',           'All Products',     true),
  ('categories',        '/categories',         'All Categories',   true),
  ('brands',            '/brands',             'All Brands',       true),
  ('deals',             '/deals',              'Deals',            true),
  ('search',            '/search',             'Search',           false),
  ('about',             '/about',              'About',            true),
  ('contact',           '/contact',            'Contact',          true),
  ('faq',               '/faq',                'FAQ',              true),
  ('cart',              '/cart',               'Cart',             false),
  ('wishlist',          '/wishlist',           'Wishlist',         false),
  ('checkout',          '/checkout',           'Checkout',         false),
  ('checkout-success',  '/checkout/success',   'Order placed',     false),
  ('policies-privacy',  '/policies/privacy',   'Privacy Policy',   true),
  ('policies-shipping', '/policies/shipping',  'Shipping Policy',  true),
  ('policies-terms',    '/policies/terms',     'Terms of Service', true),
  ('policies-warranty', '/policies/warranty',  'Warranty',         true)
on conflict (id) do nothing;
