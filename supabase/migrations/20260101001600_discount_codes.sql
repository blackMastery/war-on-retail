-- War on Retail — discount codes
--
-- Admin-issued promo codes redeemed by customers at checkout. Three types:
--
--   * percentage   - N% off the subtotal (discount_value = the percent, 0–100).
--   * fixed_amount  - a flat GYD amount off (discount_value = the amount).
--   * bogo          - "buy one get one": N% off the cheapest qualifying item
--                     (discount_value = the percent). Requires ≥ 2 items.
--
-- (There is no `free_shipping` type: the shop has no shipping cost — orders are
-- delivery/pickup settled over WhatsApp.)
--
-- Two tables:
--   * discount_codes        - the code definition + live usage counters.
--   * discount_code_usage   - one row per redemption, for per-customer limits
--                             and reporting. Customers are keyed by PHONE (the
--                             app's identity — see customers table), with a
--                             session id fallback for cart-time validation
--                             before a phone is known.
--
-- Money columns are numeric(12,2) to match the rest of the schema (GYD values
-- run to the hundreds of thousands); total_discount_given is wider since it
-- accumulates across every redemption.
--
-- RLS: enabled with NO public policies. All reads/writes flow through the
-- service-role admin client (admin CRUD) or the SECURITY DEFINER place_order
-- RPC. Mirrors the orders/customers tables.

-- ========================================================================
--   1. discount_codes
-- ========================================================================

create table if not exists public.discount_codes (
  id            uuid primary key default uuid_generate_v4(),
  code          text not null unique,
  description   text,

  -- Type + value. Meaning of discount_value depends on the type (see header).
  discount_type  text not null
    check (discount_type in ('percentage', 'fixed_amount', 'bogo')),
  discount_value numeric(12, 2) not null check (discount_value >= 0),

  -- Constraints (all optional).
  min_purchase_amount numeric(12, 2) check (min_purchase_amount is null or min_purchase_amount >= 0),
  max_discount_amount numeric(12, 2) check (max_discount_amount is null or max_discount_amount >= 0),
  usage_limit         integer        check (usage_limit is null or usage_limit >= 0),
  per_customer_limit  integer        default 1 check (per_customer_limit is null or per_customer_limit >= 0),

  -- Product / category filters. NULL or empty array = applies to everything.
  applicable_category_ids uuid[],
  applicable_product_ids  uuid[],
  exclude_product_ids     uuid[],

  -- Validity window. Either bound NULL = no boundary.
  valid_from  timestamptz,
  valid_until timestamptz,

  -- Status + tracking.
  is_active             boolean not null default true,
  usage_count           integer not null default 0,
  total_discount_given  numeric(14, 2) not null default 0,

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists discount_codes_active_idx on public.discount_codes(is_active);
create index if not exists discount_codes_window_idx
  on public.discount_codes(valid_from, valid_until)
  where is_active;

-- updated_at trigger reuses the global helper from the init migration.
drop trigger if exists set_updated_at on public.discount_codes;
create trigger set_updated_at before update on public.discount_codes
  for each row execute function public.set_updated_at();

alter table public.discount_codes enable row level security;
-- No public policies → anon blocked. Admin client (service_role) and the
-- place_order RPC (SECURITY DEFINER) are the only paths in.

-- ========================================================================
--   2. discount_code_usage
-- ========================================================================

create table if not exists public.discount_code_usage (
  id                  uuid primary key default uuid_generate_v4(),
  discount_code_id    uuid not null references public.discount_codes(id) on delete cascade,

  -- Customer identity. Phone is the app's dedup key; session id covers the
  -- cart-time estimate before a phone is entered. Both nullable so neither
  -- path is forced.
  customer_phone       text,
  customer_session_id  text,

  order_id          text,
  amount_discounted numeric(12, 2) not null check (amount_discounted >= 0),
  original_total    numeric(12, 2) not null check (original_total >= 0),
  final_total       numeric(12, 2) not null check (final_total >= 0),
  used_at           timestamptz not null default now(),
  ip_address        text,
  user_agent        text
);

create index if not exists discount_code_usage_code_idx
  on public.discount_code_usage(discount_code_id);
-- Powers the per-customer-limit count in place_order / validation.
create index if not exists discount_code_usage_code_phone_idx
  on public.discount_code_usage(discount_code_id, customer_phone);

alter table public.discount_code_usage enable row level security;
-- No public policies → service_role + RPC only.
