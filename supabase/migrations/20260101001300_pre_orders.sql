-- War on Retail — pre-orders
--
-- Adds a per-product "Allow pre-orders when out of stock" toggle and a
-- per-line `is_pre_order` snapshot on order_items. When a customer checks
-- out, the place_order RPC examines the toggle to decide whether an
-- under-stocked line raises OUT_OF_STOCK (old behaviour) or becomes a
-- pre-order line that does NOT decrement stock.
--
-- Cancellation logic is also updated: pre-order lines never decremented
-- stock at placement, so they never restock on cancel either.

-- ---------------------------------------------------------------------------
-- (a) Per-product columns
-- ---------------------------------------------------------------------------

alter table public.products
  add column if not exists is_pre_order_enabled boolean not null default false,
  -- Optional short admin-set blurb shown next to the customer's "Pre-order"
  -- CTA. E.g. "Ships within 3–4 weeks", "Expected mid-July".
  add column if not exists pre_order_message text;

-- ---------------------------------------------------------------------------
-- (b) Per-line flag on order_items
-- ---------------------------------------------------------------------------

alter table public.order_items
  add column if not exists is_pre_order boolean not null default false;

-- ---------------------------------------------------------------------------
-- (c) place_order — new line-by-line logic
-- ---------------------------------------------------------------------------
-- For each item:
--   * If product.track_inventory AND stock_quantity < quantity:
--       - If product.is_pre_order_enabled → line becomes a pre-order
--         (DO NOT touch stock_quantity).
--       - Otherwise → raise OUT_OF_STOCK.
--   * Otherwise (in stock or untracked) → line is a regular order, decrement
--     stock if tracked (unchanged behaviour).
--
-- Signature + return shape unchanged from 20260101001000_fix_place_order_ambiguity.sql.
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
  v_is_pre_order   boolean;
  v_fulfill_type   text := p_fulfillment->>'type';
  v_delivery_city  text;
  v_delivery_addr  text;
  v_phone          text := public.normalise_phone(p_customer->>'phone');
  v_name           text := trim(coalesce(p_customer->>'name', ''));
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

  insert into public.customers (name, phone)
  values (v_name, v_phone)
  on conflict (phone) do update
    set name = excluded.name,
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

    -- Reset for each iteration. v_is_pre_order is only true when the
    -- product is tracked, has insufficient stock, AND the admin allows
    -- pre-orders for it.
    v_is_pre_order := false;
    if v_product.track_inventory and v_product.stock_quantity < v_qty then
      if v_product.is_pre_order_enabled then
        v_is_pre_order := true;
      else
        raise exception 'OUT_OF_STOCK: %', v_product.name;
      end if;
    end if;

    v_line_total := v_product.price * v_qty;
    v_subtotal   := v_subtotal + v_line_total;

    insert into public.order_items (
      order_id, product_id, product_slug, product_name, product_sku,
      unit_price, quantity, line_total, is_pre_order
    )
    values (
      v_order_id, v_product.id, v_product.slug, v_product.name, v_product.sku,
      v_product.price, v_qty, v_line_total, v_is_pre_order
    );

    -- Only decrement when this is a normal in-stock line on a tracked
    -- product. Pre-orders deliberately leave stock alone so any incoming
    -- restock can flow to regular orders first.
    if not v_is_pre_order and v_product.track_inventory then
      update public.products
        set stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        where public.products.id = v_product.id;
    end if;
  end loop;

  update public.orders
    set subtotal = v_subtotal, updated_at = now()
    where public.orders.id = v_order_id;

  return query select v_order_id as order_id, v_order_number as order_number;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, uuid, jsonb)
  from public;
grant execute on function public.place_order(jsonb, jsonb, uuid, jsonb)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- (d) cancel_order — skip restock for pre-order lines
-- ---------------------------------------------------------------------------
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
    -- nothing to restore. Skip them; restock only normal in-stock lines on
    -- tracked products.
    if v_item.product_id is not null and not v_item.is_pre_order then
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
