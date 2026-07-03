-- War on Retail — product variants (Shopify-style).
--
-- A parent product declares up to 3 options (e.g. Size, Color) in
-- `products.options`; each purchasable combination is a row in
-- `product_variants` with its own SKU, price, stock and optional image.
-- Products with zero variant rows behave exactly as before — price/stock
-- come from the products row and nothing downstream changes.
--
-- Inventory model: variant stock is authoritative. A trigger mirrors the
-- sum of ACTIVE variant stock onto `products.stock_quantity` so every
-- existing read path (availability helper, stock badges, search, wishlist)
-- keeps working without query changes. `has_variants` counts ANY variant
-- row — active or not — so a product whose variants were all deactivated
-- cannot silently fall back to selling as variantless at the base price.

-- ---------------------------------------------------------------------------
-- (a) products — option definitions + trigger-maintained aggregates
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb
    constraint products_options_shape
    check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) <= 3),
  add column if not exists has_variants boolean not null default false,
  add column if not exists variant_price_min numeric(12, 2),
  add column if not exists variant_price_max numeric(12, 2);

-- ---------------------------------------------------------------------------
-- (b) product_variants
-- ---------------------------------------------------------------------------

create table if not exists public.product_variants (
  -- gen_random_uuid() is a PG13+ built-in — unlike uuid_generate_v4() it
  -- doesn't depend on the uuid-ossp extension being on the search_path
  -- (hosted Supabase installs extensions into the `extensions` schema).
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products(id) on delete cascade,
  -- e.g. {"Size":"M","Color":"Red"} — keys must match the parent's option names
  option_values    jsonb not null default '{}'::jsonb,
  sku              text unique,
  price            numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price is null or compare_at_price >= 0),
  stock_quantity   integer not null default 0,
  -- Picked from the parent product's already-uploaded gallery URLs.
  image_url        text,
  is_active        boolean not null default true,
  position         integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (product_id, option_values)
);

create index if not exists product_variants_product_idx
  on public.product_variants(product_id);

drop trigger if exists set_updated_at on public.product_variants;
create trigger set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

alter table public.product_variants enable row level security;

drop policy if exists "public read active product_variants" on public.product_variants;
create policy "public read active product_variants"
  on public.product_variants for select
  using (is_active = true);
-- Writes go through the service-role admin client only (no insert/update/
-- delete policies), same as products/brands.

-- ---------------------------------------------------------------------------
-- (c) aggregate sync — keep the parent products row's denormalized fields true
-- ---------------------------------------------------------------------------

create or replace function public.sync_product_variant_aggregates()
returns trigger
language plpgsql
as $$
declare
  v_pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    has_variants = exists (
      select 1 from public.product_variants v where v.product_id = v_pid
    ),
    variant_price_min = (
      select min(v.price) from public.product_variants v
      where v.product_id = v_pid and v.is_active
    ),
    variant_price_max = (
      select max(v.price) from public.product_variants v
      where v.product_id = v_pid and v.is_active
    ),
    -- Only variant-managed products get their stock overwritten; when the
    -- last variant row is deleted the product keeps its final summed value
    -- and becomes an ordinary variantless product again.
    stock_quantity = case
      when exists (select 1 from public.product_variants v where v.product_id = v_pid)
      then coalesce((
        select sum(v.stock_quantity) from public.product_variants v
        where v.product_id = v_pid and v.is_active
      ), 0)
      else p.stock_quantity
    end,
    updated_at = now()
  where p.id = v_pid;
  return null;
end;
$$;

drop trigger if exists sync_variant_aggregates on public.product_variants;
create trigger sync_variant_aggregates
  after insert or update or delete on public.product_variants
  for each row execute function public.sync_product_variant_aggregates();

-- ---------------------------------------------------------------------------
-- (d) order_items — variant snapshot
-- ---------------------------------------------------------------------------
-- `set null` keeps order history intact when an admin deletes a variant; the
-- sku/price snapshots already live in product_sku/unit_price so nothing in
-- the admin order pages or emails changes.

alter table public.order_items
  add column if not exists variant_id uuid
    references public.product_variants(id) on delete set null,
  add column if not exists variant_options jsonb;

-- ---------------------------------------------------------------------------
-- (e) cart_items — line identity becomes (user, product, variant)
-- ---------------------------------------------------------------------------
-- `unique nulls not distinct` (PG 15+) is deliberate: a plain unique treats
-- NULLs as distinct, so variantless lines could duplicate and PostgREST
-- upserts with onConflict would never fire. A coalesce-sentinel unique index
-- is NOT an option — PostgREST onConflict only accepts plain column lists.

alter table public.cart_items
  add column if not exists variant_id uuid
    references public.product_variants(id) on delete cascade,
  add column if not exists id uuid not null default gen_random_uuid();

alter table public.cart_items drop constraint if exists cart_items_pkey;
alter table public.cart_items add primary key (id);

alter table public.cart_items
  drop constraint if exists cart_items_user_product_variant_key;
alter table public.cart_items
  add constraint cart_items_user_product_variant_key
  unique nulls not distinct (user_id, product_id, variant_id);

-- ---------------------------------------------------------------------------
-- (f) merge_cart — fold guest lines per (product, variant)
-- ---------------------------------------------------------------------------
-- Same body as 20260101003200_cart_items.sql, extended with variant_id.

create or replace function public.merge_cart(p_items jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return 0;
  end if;

  insert into public.cart_items (user_id, product_id, variant_id, quantity)
    select
      v_uid,
      (item->>'product_id')::uuid,
      nullif(item->>'variant_id', '')::uuid,
      (item->>'quantity')::integer
    from jsonb_array_elements(p_items) as item
    where (item->>'product_id') is not null
      and (item->>'quantity')::integer > 0
      and exists (
        select 1 from public.products p
        where p.id = (item->>'product_id')::uuid
          and p.is_active = true
      )
      and (
        nullif(item->>'variant_id', '') is null
        or exists (
          select 1 from public.product_variants v
          where v.id = (item->>'variant_id')::uuid
            and v.product_id = (item->>'product_id')::uuid
            and v.is_active = true
        )
      )
  on conflict (user_id, product_id, variant_id) do update
    set quantity   = cart_items.quantity + excluded.quantity,
        updated_at = now();
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

revoke all on function public.merge_cart(jsonb) from public, anon;
grant execute on function public.merge_cart(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- (g) place_order — variant-aware item loop
-- ---------------------------------------------------------------------------
-- Same signature/body as 20260101003000_place_order_link_user.sql; only the
-- item loop changes. Lock order is always parent product first, then the
-- variant row, so concurrent checkouts can never deadlock.

create or replace function public.place_order(
  p_customer           jsonb,
  p_fulfillment        jsonb,
  p_payment_method_id  uuid,
  p_items              jsonb,
  p_discount_code      text default null
)
returns table (order_id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id     uuid;
  v_order_id        uuid;
  v_order_number    text;
  v_subtotal        numeric(12, 2) := 0;
  v_item            jsonb;
  v_product         public.products;
  v_variant         public.product_variants;
  v_has_variants    boolean;
  v_unit_price      numeric(12, 2);
  v_sku             text;
  v_qty             integer;
  v_line_total      numeric(12, 2);
  v_is_pre_order    boolean;
  v_fulfill_type    text := p_fulfillment->>'type';
  v_delivery_city   text;
  v_delivery_addr   text;
  v_phone           text := public.normalise_phone(p_customer->>'phone');
  v_name            text := trim(coalesce(p_customer->>'name', ''));
  v_email           text := nullif(trim(coalesce(p_customer->>'email', '')), '');

  -- Discount working state. Populated while walking the items so the discount
  -- block below can check applicability + compute BOGO without a second pass.
  v_code            text := nullif(trim(coalesce(p_discount_code, '')), '');
  v_discount        public.discount_codes;
  v_discount_amount numeric(12, 2) := 0;
  v_item_count      integer := 0;
  v_min_price       numeric(12, 2);
  v_cart_products   uuid[] := array[]::uuid[];
  v_cart_categories uuid[] := array[]::uuid[];
  v_customer_uses   integer;
begin
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

  perform 1 from public.payment_methods
    where public.payment_methods.id = p_payment_method_id
      and is_active = true;
  if not found then
    raise exception 'PM_INACTIVE: payment method is missing or inactive';
  end if;

  if v_fulfill_type = 'delivery' then
    v_delivery_city := trim(coalesce(p_fulfillment->>'city', ''));
    v_delivery_addr := trim(coalesce(p_fulfillment->>'address', ''));
    if v_delivery_addr = '' then
      raise exception 'BAD_FULFILLMENT: delivery address required';
    end if;
  end if;

  -- Link to the signed-in account when present; anon checkout passes null.
  insert into public.customers (name, phone, email, user_id)
  values (v_name, v_phone, v_email, auth.uid())
  on conflict (phone) do update
    set name = excluded.name,
        email = coalesce(excluded.email, public.customers.email),
        user_id = coalesce(public.customers.user_id, auth.uid()),
        updated_at = now()
  returning public.customers.id into v_customer_id;

  select public.format_order_number(nextval('public.orders_seq'))
    into v_order_number;

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

    -- ANY variant row (active or not) makes the product variant-managed:
    -- buying it without picking a variant is never allowed, even if the
    -- admin has deactivated every combination.
    v_has_variants := exists (
      select 1 from public.product_variants pv
      where pv.product_id = v_product.id
    );

    v_is_pre_order := false;

    if nullif(v_item->>'variant_id', '') is not null then
      select * into v_variant
        from public.product_variants
        where public.product_variants.id = (v_item->>'variant_id')::uuid
          and product_id = v_product.id
          and is_active = true
        for update;

      if not found then
        raise exception 'VARIANT_MISSING: variant % is unavailable',
          v_item->>'variant_id';
      end if;

      if v_product.track_inventory and v_variant.stock_quantity < v_qty then
        if v_product.is_pre_order_enabled then
          v_is_pre_order := true;
        else
          raise exception 'OUT_OF_STOCK: %', v_product.name;
        end if;
      end if;

      v_unit_price := v_variant.price;
      v_sku        := coalesce(v_variant.sku, v_product.sku);
      v_line_total := v_unit_price * v_qty;

      insert into public.order_items (
        order_id, product_id, product_slug, product_name, product_sku,
        unit_price, quantity, line_total, is_pre_order,
        variant_id, variant_options
      )
      values (
        v_order_id, v_product.id, v_product.slug, v_product.name, v_sku,
        v_unit_price, v_qty, v_line_total, v_is_pre_order,
        v_variant.id, v_variant.option_values
      );

      if not v_is_pre_order and v_product.track_inventory then
        -- The aggregate trigger re-syncs products.stock_quantity.
        update public.product_variants
          set stock_quantity = stock_quantity - v_qty,
              updated_at = now()
          where public.product_variants.id = v_variant.id;
      end if;
    else
      if v_has_variants then
        raise exception 'VARIANT_REQUIRED: % requires selecting options',
          v_product.name;
      end if;

      if v_product.track_inventory and v_product.stock_quantity < v_qty then
        if v_product.is_pre_order_enabled then
          v_is_pre_order := true;
        else
          raise exception 'OUT_OF_STOCK: %', v_product.name;
        end if;
      end if;

      v_unit_price := v_product.price;
      v_line_total := v_unit_price * v_qty;

      insert into public.order_items (
        order_id, product_id, product_slug, product_name, product_sku,
        unit_price, quantity, line_total, is_pre_order
      )
      values (
        v_order_id, v_product.id, v_product.slug, v_product.name, v_product.sku,
        v_unit_price, v_qty, v_line_total, v_is_pre_order
      );

      if not v_is_pre_order and v_product.track_inventory then
        update public.products
          set stock_quantity = stock_quantity - v_qty,
              updated_at = now()
          where public.products.id = v_product.id;
      end if;
    end if;

    v_subtotal := v_subtotal + v_line_total;

    -- Accumulate discount inputs from the locked rows (variant-aware price).
    v_item_count := v_item_count + v_qty;
    if v_min_price is null or v_unit_price < v_min_price then
      v_min_price := v_unit_price;
    end if;
    v_cart_products := array_append(v_cart_products, v_product.id);
    if v_product.category_id is not null then
      v_cart_categories := array_append(v_cart_categories, v_product.category_id);
    end if;
  end loop;

  update public.orders
    set subtotal = v_subtotal, updated_at = now()
    where public.orders.id = v_order_id;

  -- ----- Discount (authoritative) -----------------------------------------
  if v_code is not null then
    -- Lock the code row for the rest of the transaction so concurrent
    -- checkouts can't blow past usage_limit / per_customer_limit.
    select * into v_discount
      from public.discount_codes
      where upper(code) = upper(v_code)
      for update;

    if not found then
      raise exception 'DISCOUNT_NOT_FOUND: %', v_code;
    end if;
    if not v_discount.is_active then
      raise exception 'DISCOUNT_INACTIVE: %', v_code;
    end if;
    if v_discount.valid_from is not null and now() < v_discount.valid_from then
      raise exception 'DISCOUNT_NOT_STARTED: %', v_code;
    end if;
    if v_discount.valid_until is not null and now() > v_discount.valid_until then
      raise exception 'DISCOUNT_EXPIRED: %', v_code;
    end if;
    if v_discount.min_purchase_amount is not null
       and v_subtotal < v_discount.min_purchase_amount then
      raise exception 'DISCOUNT_MIN_PURCHASE: %', v_discount.min_purchase_amount;
    end if;
    if v_discount.usage_limit is not null
       and v_discount.usage_count >= v_discount.usage_limit then
      raise exception 'DISCOUNT_USAGE_LIMIT: %', v_code;
    end if;
    if v_discount.per_customer_limit is not null
       and v_discount.per_customer_limit > 0 then
      select count(*) into v_customer_uses
        from public.discount_code_usage
        where discount_code_id = v_discount.id
          and customer_phone = v_phone;
      if v_customer_uses >= v_discount.per_customer_limit then
        raise exception 'DISCOUNT_PER_CUSTOMER_LIMIT: %', v_code;
      end if;
    end if;
    if v_discount.applicable_product_ids is not null
       and array_length(v_discount.applicable_product_ids, 1) is not null
       and not (v_cart_products && v_discount.applicable_product_ids) then
      raise exception 'DISCOUNT_NOT_APPLICABLE: no qualifying products';
    end if;
    if v_discount.applicable_category_ids is not null
       and array_length(v_discount.applicable_category_ids, 1) is not null
       and not (v_cart_categories && v_discount.applicable_category_ids) then
      raise exception 'DISCOUNT_NOT_APPLICABLE: no qualifying categories';
    end if;
    if v_discount.exclude_product_ids is not null
       and array_length(v_discount.exclude_product_ids, 1) is not null
       and (v_cart_products && v_discount.exclude_product_ids) then
      raise exception 'DISCOUNT_EXCLUDED: cart contains an excluded product';
    end if;

    -- Compute the raw amount per type.
    if v_discount.discount_type = 'percentage' then
      v_discount_amount := round(v_subtotal * v_discount.discount_value / 100, 2);
    elsif v_discount.discount_type = 'fixed_amount' then
      v_discount_amount := v_discount.discount_value;
    elsif v_discount.discount_type = 'bogo' then
      if v_item_count < 2 then
        raise exception 'DISCOUNT_BOGO_MIN_ITEMS: requires at least 2 items';
      end if;
      v_discount_amount := round(coalesce(v_min_price, 0) * v_discount.discount_value / 100, 2);
    end if;

    -- Cap, then clamp so the order can never go negative.
    if v_discount.max_discount_amount is not null
       and v_discount_amount > v_discount.max_discount_amount then
      v_discount_amount := v_discount.max_discount_amount;
    end if;
    if v_discount_amount > v_subtotal then
      v_discount_amount := v_subtotal;
    end if;
    if v_discount_amount < 0 then
      v_discount_amount := 0;
    end if;

    update public.orders
      set discount_code_id = v_discount.id,
          discount_code = v_discount.code,
          discount_amount = v_discount_amount,
          updated_at = now()
      where public.orders.id = v_order_id;

    insert into public.discount_code_usage (
      discount_code_id, customer_phone, order_id,
      amount_discounted, original_total, final_total
    )
    values (
      v_discount.id, v_phone, v_order_number,
      v_discount_amount, v_subtotal, v_subtotal - v_discount_amount
    );

    update public.discount_codes
      set usage_count = usage_count + 1,
          total_discount_given = total_discount_given + v_discount_amount,
          updated_at = now()
      where public.discount_codes.id = v_discount.id;
  end if;

  return query select v_order_id as order_id, v_order_number as order_number;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, uuid, jsonb, text)
  from public;
grant execute on function public.place_order(jsonb, jsonb, uuid, jsonb, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- (h) cancel_order — restock the variant when the line has one
-- ---------------------------------------------------------------------------
-- Same body as 20260101001300_pre_orders.sql; only the restock branch changes.
-- A deleted variant nulls the line's variant_id (on delete set null) and the
-- code falls through to the product branch — same grace as deleted products.

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

  for v_item in
    select * from public.order_items where order_id = p_id
  loop
    -- Pre-order lines never decremented stock at placement, so they have
    -- nothing to restore.
    if v_item.product_id is not null and not v_item.is_pre_order then
      if v_item.variant_id is not null then
        -- The aggregate trigger re-syncs products.stock_quantity.
        update public.product_variants
          set stock_quantity = stock_quantity + v_item.quantity,
              updated_at = now()
          where id = v_item.variant_id;
      else
        update public.products
          set stock_quantity = stock_quantity + v_item.quantity,
              updated_at = now()
          where id = v_item.product_id
            and track_inventory = true;
      end if;
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
