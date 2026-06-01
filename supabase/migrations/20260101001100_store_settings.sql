-- War on Retail — store settings (single-row, admin-editable)
--
-- One row, always. The check on `singleton` + the unique constraint guarantee
-- nobody can insert a second row by accident — every UPDATE goes through the
-- one canonical row.
--
-- Why a table at all (instead of env vars): some of these — address, hours,
-- WhatsApp, the GPS pin — change without redeploys. The team should be able
-- to edit them from /admin/settings without bothering an engineer.

create table if not exists public.store_settings (
  -- Singleton: only ever one row, identified by id='default'.
  id            text primary key default 'default'
                  check (id = 'default'),

  -- Brand-level basics
  name          text not null default 'War on Retail',
  description   text not null default 'Your trusted electronics and home-appliance store in Guyana.',
  url           text not null default 'https://www.waronretailguyana.com',

  -- Contact channels
  email         text not null default 'info@waronretail.com',
  phone         text not null default '592-694-3827',
  whatsapp      text not null default '5926943827',  -- E.164 digits only; no `+`
  admin_email   text not null default 'admin@waronretail.com',

  -- Address + GPS
  address       text not null default 'Georgetown, Guyana',
  latitude      numeric(9, 6),                       -- nullable; address used when missing
  longitude     numeric(9, 6),

  -- Hours (three free-form lines so non-engineers can phrase them naturally)
  hours_weekdays text not null default 'Mon–Fri 9:00 AM – 6:00 PM',
  hours_saturday text not null default 'Sat 9:00 AM – 4:00 PM',
  hours_sunday   text not null default 'Sun Closed',

  -- Social
  facebook_url  text default 'https://facebook.com/waronretail',
  instagram_url text default 'https://instagram.com/waronretail',
  twitter_url   text default 'https://twitter.com/waronretail',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.store_settings;
create trigger set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- Seed the singleton row if it doesn't exist. All columns use their defaults.
insert into public.store_settings (id) values ('default')
  on conflict (id) do nothing;

-- ---------- RLS ----------
alter table public.store_settings enable row level security;

-- The customer-facing pages (Header, Footer, Checkout map, etc.) need to read
-- these values. They're not secrets — everything here is already shown on the
-- public site — so anon SELECT is fine.
drop policy if exists "public read store_settings" on public.store_settings;
create policy "public read store_settings"
  on public.store_settings for select
  using (true);

-- Writes go through the admin server actions, which use the service-role
-- client. No anon/authenticated mutation policy needed.
