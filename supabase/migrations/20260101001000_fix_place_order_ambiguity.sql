-- War on Retail — fix place_order column-name ambiguity
--
-- The previous definition declared `RETURNS TABLE (id uuid, order_number text)`.
-- In PL/pgSQL these become OUT parameters visible everywhere inside the
-- function body, so every reference like `where id = …` or
-- `returning id into v_…` was ambiguous against the products / orders /
-- customers `id` column.
--
-- Postgres surfaced this at call time as:
--   `column reference "id" is ambiguous`
--
-- Fix: rename the OUT column to `order_id`. The Next.js client only reads
-- `order_number` (the `id` field was never consumed), so the rename is a
-- safe API change. `CREATE OR REPLACE FUNCTION` can't change return types,
-- so we DROP + CREATE.

drop function if exists public.place_order(jsonb, jsonb, uuid, jsonb);

create function public.place_order(
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

  update public.orders
    set subtotal = v_subtotal, updated_at = now()
    where public.orders.id = v_order_id;

  -- Aliases here are belt-and-braces; the OUT columns above are already
  -- `order_id` and `order_number`, but being explicit reads more clearly.
  return query select v_order_id as order_id, v_order_number as order_number;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb, uuid, jsonb)
  from public;
grant execute on function public.place_order(jsonb, jsonb, uuid, jsonb)
  to anon, authenticated, service_role;
