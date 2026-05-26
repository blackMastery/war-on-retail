-- War on Retail — promotions (homepage specials)
--
-- One row per promotional image the admin uploads. The homepage queries this
-- table and, when at least one row is currently in-window, renders a mosaic
-- in place of the hero band.
--
-- Images live in a separate Storage bucket called `promotions` (public read).
-- Create it in the dashboard before uploading, or uncomment the insert below.

create table if not exists public.promotions (
  id            uuid primary key default uuid_generate_v4(),
  title         text not null,           -- doubles as alt text and admin label
  image_url     text not null,
  is_featured   boolean not null default false,  -- true → takes the large slot
  display_order integer not null default 0,

  -- Optional schedule. Either bound can be NULL to mean "no boundary".
  starts_at     timestamptz,
  ends_at       timestamptz,

  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists promotions_active_idx on public.promotions(is_active);
create index if not exists promotions_window_idx
  on public.promotions(starts_at, ends_at)
  where is_active;

-- updated_at trigger reuses the global helper from the init migration.
drop trigger if exists set_updated_at on public.promotions;
create trigger set_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
alter table public.promotions enable row level security;

drop policy if exists "public read active promotions" on public.promotions;
create policy "public read active promotions"
  on public.promotions for select
  using (
    is_active = true
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now())
  );

-- ---------- Storage policy ----------
-- The bucket itself must be created in the dashboard as a PUBLIC bucket
-- named `promotions`. After it exists, this policy enables anonymous reads.
drop policy if exists "public read promotions" on storage.objects;
create policy "public read promotions"
  on storage.objects for select
  using (bucket_id = 'promotions');
