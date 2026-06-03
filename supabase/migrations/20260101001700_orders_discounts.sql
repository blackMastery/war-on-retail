-- War on Retail — discounts on orders
--
-- Wires the discount_codes system (20260101001600) into the order pipeline.
--
--   (a) orders gains a snapshot of the applied code + the GYD amount taken off.
--       Payable total is computed as `subtotal - discount_amount` in the app
--       (the cart and admin both derive it; we don't store a redundant total).
--
--   (b) place_order is recreated with a new optional 5th param,
--       `p_discount_code`. When supplied, the RPC re-validates the code against
--       the DB-locked prices (this is the AUTHORITATIVE check — the
--       /api/discounts/validate route is only a cart-time estimate), computes
--       the discount, stamps the order, records a discount_code_usage row, and
--       bumps the code's usage_count + total_discount_given — all inside the
--       same transaction as the stock decrement, so a code can't be over-used
--       under concurrency (the code row is locked FOR UPDATE).
--
--   Discount failures raise `DISCOUNT_<REASON>: …` so the checkout action can
--   map them to friendly messages, exactly like OUT_OF_STOCK et al.
--
-- Adding a parameter changes the function signature, so (like the ambiguity
-- fix in 20260101001000) we DROP + CREATE rather than CREATE OR REPLACE.

-- ---------------------------------------------------------------------------
-- (a) orders columns
-- ---------------------------------------------------------------------------

alter table public.orders
  add column if not exists discount_code_id uuid
    references public.discount_codes(id) on delete set null,
  add column if not exists discount_code text,
  add column if not exists discount_amount numeric(12, 2) not null default 0
    check (discount_amount >= 0);

-- ---------------------------------------------------------------------------
-- (b) place_order — now discount-aware
-- ---------------------------------------------------------------------------

drop function if exists public.place_order(jsonb, jsonb, uuid, jsonb);
drop function if exists public.place_order(jsonb, jsonb, uuid, jsonb, text);

create function public.place_order(
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
  v_qty             integer;
  v_line_total      numeric(12, 2);
  v_is_pre_order    boolean;
  v_fulfill_type    text := p_fulfillment->>'type';
  v_delivery_city   text;
  v_delivery_addr   text;
  v_phone           text := public.normalise_phone(p_customer->>'phone');
  v_name            text := trim(coalesce(p_customer->>'name', ''));

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

    -- Accumulate discount inputs from the locked product rows.
    v_item_count := v_item_count + v_qty;
    if v_min_price is null or v_product.price < v_min_price then
      v_min_price := v_product.price;
    end if;
    v_cart_products := array_append(v_cart_products, v_product.id);
    if v_product.category_id is not null then
      v_cart_categories := array_append(v_cart_categories, v_product.category_id);
    end if;

    insert into public.order_items (
      order_id, product_id, product_slug, product_name, product_sku,
      unit_price, quantity, line_total, is_pre_order
    )
    values (
      v_order_id, v_product.id, v_product.slug, v_product.name, v_product.sku,
      v_product.price, v_qty, v_line_total, v_is_pre_order
    );

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
