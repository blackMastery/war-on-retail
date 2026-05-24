-- War on Retail — initial schema
-- Creates core commerce tables: categories, brands, products, FAQs, chatbot
-- conversations, admin_users. Mirrors the build plan §3.

create extension if not exists "uuid-ossp";

-- ---------- categories ----------
create table if not exists public.categories (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  slug          text not null unique,
  description   text,
  image_url     text,
  parent_id     uuid references public.categories(id) on delete set null,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists categories_parent_idx on public.categories(parent_id);
create index if not exists categories_active_idx on public.categories(is_active);

-- ---------- brands ----------
create table if not exists public.brands (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  slug          text not null unique,
  description   text,
  logo_url      text,
  website_url   text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists brands_active_idx on public.brands(is_active);

-- ---------- products ----------
create table if not exists public.products (
  id                  uuid primary key default uuid_generate_v4(),
  name                text not null,
  slug                text not null unique,
  description         text,
  short_description   text,
  sku                 text unique,

  -- pricing (GYD by default)
  price               numeric(12, 2) not null check (price >= 0),
  compare_at_price    numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  cost                numeric(12, 2),

  -- inventory
  stock_quantity      integer not null default 0,
  low_stock_threshold integer not null default 5,
  track_inventory     boolean not null default true,

  -- relationships
  category_id         uuid references public.categories(id) on delete set null,
  brand_id            uuid references public.brands(id) on delete set null,

  -- media
  featured_image_url  text,
  image_urls          text[] not null default '{}',

  -- flexible per-product attributes (e.g. {"color":"black","screen_size":"55"})
  specifications      jsonb not null default '{}'::jsonb,

  -- seo
  meta_title          text,
  meta_description    text,

  -- status
  is_active           boolean not null default true,
  is_featured         boolean not null default false,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_active_idx on public.products(is_active);
create index if not exists products_featured_idx on public.products(is_featured) where is_featured;

-- Full-text search index for name + description + SKU.
create index if not exists products_search_idx on public.products
  using gin (
    to_tsvector(
      'english',
      coalesce(name, '') || ' ' ||
      coalesce(short_description, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(sku, '')
    )
  );

-- ---------- faq categories + faqs ----------
create table if not exists public.faq_categories (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null unique,
  slug          text not null unique,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create table if not exists public.faqs (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid references public.faq_categories(id) on delete set null,
  question     text not null,
  answer       text not null,
  keywords     text[] not null default '{}',
  usage_count  integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists faqs_active_idx on public.faqs(is_active);
-- Full-text search index on question + answer. `keywords` is intentionally
-- excluded because `array_to_string` is only STABLE, not IMMUTABLE, and
-- Postgres rejects non-IMMUTABLE expressions in index definitions. Keyword
-- matching happens in JS (see src/lib/ai/chatbot.ts) so we lose nothing here.
create index if not exists faqs_search_idx on public.faqs
  using gin (to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, '')));
-- Separate GIN index for exact-keyword array lookups (e.g. WHERE keywords && '{delivery}').
create index if not exists faqs_keywords_idx on public.faqs using gin (keywords);

-- ---------- chatbot conversation log ----------
create table if not exists public.chatbot_conversations (
  id               uuid primary key default uuid_generate_v4(),
  session_id       text not null,
  user_message     text not null,
  bot_response     text not null,
  matched_faq_id   uuid references public.faqs(id) on delete set null,
  confidence_score numeric(3, 2),
  was_helpful      boolean,
  created_at       timestamptz not null default now()
);
create index if not exists chatbot_session_idx on public.chatbot_conversations(session_id, created_at);

-- ---------- admin users ----------
-- Mirrors Supabase auth.users by email. The id column matches auth.users(id)
-- so we can join via foreign key without duplicating identity state.
create table if not exists public.admin_users (
  id         uuid primary key,
  email      text not null unique,
  full_name  text not null,
  role       text not null default 'admin' check (role in ('admin', 'super_admin')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- updated_at trigger ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  foreach t in array array['categories','brands','products','faqs','admin_users']
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end$$;
