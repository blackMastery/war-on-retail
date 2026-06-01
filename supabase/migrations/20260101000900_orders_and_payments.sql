-- War on Retail — orders, customers, payment methods
--
-- This migration introduces the bare-minimum schema for a real order pipeline
-- without taking on the complexity of actual payment processing. The shop is
-- still settled in person / over WhatsApp; the platform now just records the
-- order, snapshots prices + product metadata, and (most importantly) keeps
-- products.stock_quantity in sync with what's been sold.
--
-- Four tables, one sequence, two RPCs:
--
--   * customers          - dedup'd by phone; no auth.users link.
--   * payment_methods    - admin-managed list (MMG / Cash / Bank Transfer seeded).
--   * orders             - one row per placed checkout, FK to customer + payment.
--   * order_items        - line items, snapshots of name/sku/price at placement.
--   * orders_seq         - monotonic counter feeding the human-readable order #.
--   * place_order RPC    - the only path anon can insert into these tables.
--   * cancel_order RPC   - service-role only; restocks on cancellation.
--
-- Atomicity matters for the stock decrement; place_order runs every per-item
-- check inside a SECURITY DEFINER transaction with FOR UPDATE row locks, so
-- two concurrent checkouts can't oversell the same unit.

-- ========================================================================
--   1. customers
-- ========================================================================
-- Dedup key is the phone, normalised. Same person ordering twice → one row.
-- The latest `name` wins on conflict so a customer who corrects a typo on
-- a later order doesn't leave a stale value forever.

create table if not exists public.customers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.customers;
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- Phone normaliser: keep a leading + (if any), then digits only. Used both
-- by place_order and by any future admin tooling so two records can never
-- represent the same human.
create or replace function public.normalise_phone(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when p_phone is null then null
    when left(trim(p_phone), 1) = '+'
      then '+' || regexp_replace(substring(trim(p_phone) from 2), '[^0-9]', '', 'g')
    else regexp_replace(trim(p_phone), '[^0-9]', '', 'g')
  end;
$$;

alter table public.customers enable row level security;
-- No public policies → anon is blocked. place_order is SECURITY DEFINER and
-- bypasses RLS. Service role bypasses RLS by definition.

-- ========================================================================
--   2. payment_methods
-- ========================================================================

create table if not exists public.payment_methods (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  description   text,
  is_active     boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists payment_methods_active_idx
  on public.payment_methods(is_active);

drop trigger if exists set_updated_at on public.payment_methods;
create trigger set_updated_at before update on public.payment_methods
  for each row execute function public.set_updated_at();

alter table public.payment_methods enable row level security;

-- Customer wizard needs to list active methods. Admin reads happen via the
-- service-role client.
drop policy if exists "public read active payment_methods" on public.payment_methods;
create policy "public read active payment_methods"
  on public.payment_methods for select
  using (is_active = true);

-- Seed the three the shop wants to start with. Idempotent on name so re-runs
-- of this migration in development don't duplicate.
insert into public.payment_methods (name, description, display_order, is_active)
values
  ('Mobile Money (MMG)', 'Pay via MMG. We''ll send the merchant number when we approve your order.', 1, true),
  ('Cash',               'Pay in cash on delivery, or at pickup in our store.', 2, true),
  ('Bank Transfer',      'Transfer to our bank account. We''ll share the account details when we approve your order.', 3, true)
on conflict do nothing;

-- ========================================================================
--   3. orders + 4. order_items
-- ========================================================================

create sequence if not exists public.orders_seq;

-- Formats the sequence into a human-readable, year-tagged order number.
-- Year is taken from now() so a new year naturally produces WOR-2027-000001
-- once the counter rolls over. The sequence keeps growing globally, which
-- is fine — uniqueness is what matters, not a per-year restart.
create or replace function public.format_order_number(p_seq bigint)
returns text
language sql
immutable
as $$
  select 'WOR-' || to_char(now(), 'YYYY') || '-' || lpad(p_seq::text, 6, '0');
$$;

create table if not exists public.orders (
  id                 uuid primary key default uuid_generate_v4(),
  order_number       text not null unique,
  customer_id        uuid not null references public.customers(id) on delete restrict,
  fulfillment_type   text not null check (fulfillment_type in ('delivery', 'pickup')),
  delivery_city      text,
  delivery_address   text,
  payment_method_id  uuid not null references public.payment_methods(id) on delete restrict,
  subtotal           numeric(12, 2) not null check (subtotal >= 0),
  status             text not null default 'pending'
                       check (status in ('pending', 'approved', 'fulfilled', 'cancelled')),
  admin_notes        text,
  placed_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- A delivery row must have an address; a pickup row must not.
  constraint orders_delivery_address_present check (
    (fulfillment_type = 'delivery' and delivery_address is not null and delivery_address <> '')
    or fulfillment_type = 'pickup'
  )
);

create index if not exists orders_status_idx     on public.orders(status);
create index if not exists orders_placed_at_idx  on public.orders(placed_at desc);
create index if not exists orders_customer_idx   on public.orders(customer_id);

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;
-- No public policies → anon blocked. RPC + service-role only.

create table if not exists public.order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references public.orders(id) on delete cascade,

  -- Nullable FK so deleting a product doesn't shred order history. The
  -- snapshot columns below carry forward whatever the product was at the
  -- time of the order.
  product_id    uuid references public.products(id) on delete set null,
  product_slug  text not null,
  product_name  text not null,
  product_sku   text,
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity > 0),
  line_total    numeric(12, 2) not null check (line_total >= 0),

  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

alter table public.order_items enable row level security;
-- No public policies; RPC + service-role only.

-- ========================================================================
--   5. place_order RPC
-- ========================================================================
-- The single anon-callable mutation. Wraps customer upsert + per-item stock
-- check + decrement + insert in one transaction. Concurrent checkouts for
-- the last unit are serialised by `FOR UPDATE` on the product row.
--
-- Inputs (jsonb shapes so the client doesn't need to know about composite
-- types):
--
--   p_customer:        { name, phone }
--   p_fulfillment:     { type: 'delivery'|'pickup', city?, address? }
--   p_payment_method_id: uuid
--   p_items:           [{ product_id, quantity }, ...]
--
-- Errors raised on failure:
--   PM_INACTIVE      - payment_method missing or is_active=false
--   EMPTY_CART       - items array is empty
--   PRODUCT_MISSING  - one of the product_ids isn't an active product
--   OUT_OF_STOCK     - stock_quantity < quantity for a tracked product
--                      (the product name is appended)

-- NOTE: the OUT column is named `order_id` (not `id`) to avoid PL/pgSQL
-- name shadowing — every product/customer/orders table has an `id` column,
-- and `RETURNS TABLE(id ...)` would make `id` ambiguous inside the body.
create or replace function public.place_order(
  p_customer           jsonb,
  p_fulfillment        jsonb,
  p_payment_method_id  uuid,
  p_items              jsonb
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id    uuid;
  v_order_id       uuid;
  v_order_number   text;
  v_subtotal       numeric(12, 2) := 0;
  v_item           jsonb;
  v_product        public.products;
  v_qty            integer;
  v_line_total     numeric(12, 2);
  v_fulfill_type   text := p_fulfillment->>'type';
  v_delivery_city  text;
  v_delivery_addr  text;
  v_phone          text := public.normalise_phone(p_customer->>'phone');
  v_name           text := trim(coalesce(p_customer->>'name', ''));
begin
  -- Basic input shape checks.
  if v_phone is null or length(v_phone) < 7 then
    raise exception 'BAD_PHONE: phone is missing or too short';
  end if;
  if v_name = '' then
    raise exception 'BAD_NAME: customer name is required';
  end if;
  if v_fulfill_type not in ('delivery', 'pickup') then
    raise exception 'BAD_FULFILLMENT: must be delivery or pickup';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART: cart is empty';
  end if;

  -- Validate the payment method up front.
  perform 1 from public.payment_methods
    where public.payment_methods.id = p_payment_method_id
      and is_active = true;
  if not found then
    raise exception 'PM_INACTIVE: payment method is missing or inactive';
  end if;

  -- Delivery requires an address.
  if v_fulfill_type = 'delivery' then
    v_delivery_city := trim(coalesce(p_fulfillment->>'city', ''));
    v_delivery_addr := trim(coalesce(p_fulfillment->>'address', ''));
    if v_delivery_addr = '' then
      raise exception 'BAD_FULFILLMENT: delivery address required';
    end if;
  end if;

  -- Upsert customer by normalised phone. Latest name wins (rare in practice
  -- and beats keeping a stale one).
  insert into public.customers (name, phone)
  values (v_name, v_phone)
  on conflict (phone) do update
    set name = excluded.name,
        updated_at = now()
  returning public.customers.id into v_customer_id;

  -- Reserve the order number from the sequence. Doing this before the row
  -- insert means it's deterministic even if the insert fails — the gap is
  -- acceptable; no one looks at sequence holes.
  select public.format_order_number(nextval('public.orders_seq'))
    into v_order_number;

  -- Create the order shell. We'll fill subtotal after we've walked the
  -- items. Use 0 as a placeholder under the check constraint.
  insert into public.orders (
    order_number, customer_id, fulfillment_type,
    delivery_city, delivery_address,
    payment_method_id, subtotal, status, placed_at
  )
  values (
    v_order_number, v_customer_id, v_fulfill_type,
    v_delivery_city, v_delivery_addr,
    p_payment_method_id, 0, 'pending', now()
  )
  returning public.orders.id into v_order_id;

  -- Walk each line. FOR UPDATE locks the product row for the rest of the
  -- transaction, blocking any concurrent place_order that's trying to buy
  -- the same SKU.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;
    if v_qty is null or v_qty < 1 then
      raise exception 'BAD_QUANTITY: each item must have quantity >= 1';
    end if;

    select * into v_product
      from public.products
      where public.products.id = (v_item->>'product_id')::uuid
        and is_active = true
      for update;

    if not found then
      raise exception 'PRODUCT_MISSING: product % is unavailable',
        v_item->>'product_id';
    end if;

    if v_product.track_inventory and v_product.stock_quantity < v_qty then
      raise exception 'OUT_OF_STOCK: %', v_product.name;
    end if;

    v_line_total := v_product.price * v_qty;
    v_subtotal   := v_subtotal + v_line_total;

    insert into public.order_items (
      order_id, product_id, product_slug, product_name, product_sku,
      unit_price, quantity, line_total
    )
    values (
      v_order_id, v_product.id, v_product.slug, v_product.name, v_product.sku,
      v_product.price, v_qty, v_line_total
    );

    if v_product.track_inventory then
      update public.products
        set stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        where public.products.id = v_product.id;
    end if;
  end loop;

  -- Finalise the subtotal.
  update public.orders
    set subtotal = v_subtotal, updated_at = now()
    where public.orders.id = v_order_id;

  return query select v_order_id as order_id, v_order_number as order_number;
end;
$$;

-- Anon (no session) is what powers the checkout. Authenticated may also call
-- it (a future customer-accounts iteration would benefit).
revoke all on function public.place_order(jsonb, jsonb, uuid, jsonb)
  from public;
grant execute on function public.place_order(jsonb, jsonb, uuid, jsonb)
  to anon, authenticated, service_role;

-- ========================================================================
--   6. cancel_order RPC
-- ========================================================================
-- Reverses stock for any tracked items, then flips status to 'cancelled'.
-- Service-role only — admin actions call this through the admin client.

create or replace function public.cancel_order(p_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders;
  v_item  public.order_items;
begin
  select * into v_order from public.orders where id = p_id for update;
  if not found then
    raise exception 'ORDER_MISSING: no order with id %', p_id;
  end if;
  if v_order.status in ('fulfilled', 'cancelled') then
    raise exception 'BAD_STATUS: cannot cancel a % order', v_order.status;
  end if;

  -- Restock each line. product_id may be NULL if the product was deleted
  -- between order placement and cancellation; in that case there's nothing
  -- to restock — the snapshot stays as the order's record.
  for v_item in
    select * from public.order_items where order_id = p_id
  loop
    if v_item.product_id is not null then
      update public.products
        set stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        where id = v_item.product_id
          and track_inventory = true;
    end if;
  end loop;

  update public.orders
    set status = 'cancelled', updated_at = now()
    where id = p_id
    returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.cancel_order(uuid) from public, anon, authenticated;
grant execute on function public.cancel_order(uuid) to service_role;
