-- War on Retail — returning-customer lookup at checkout
--
-- Lets the checkout's Step 1 "Find my info" button fetch a returning customer's
-- saved name + most recent delivery address by phone, so repeat buyers don't
-- re-type everything.
--
-- The `customers` / `orders` tables have RLS with no public policies (anon is
-- blocked), so — like `place_order` — this is a SECURITY DEFINER RPC granted to
-- anon. It deliberately returns ONLY whitelisted fields (name + last delivery),
-- never phone/email/order history, so the lookup can't be used to enumerate
-- anything else. The phone is normalised with the same `normalise_phone` helper
-- used at order placement, so the search key matches how phones are stored.

create or replace function public.lookup_customer_by_phone(p_phone text)
returns table (name text, last_delivery_city text, last_delivery_address text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone    text := public.normalise_phone(p_phone);
  v_customer public.customers;
begin
  -- Too short / blank → empty result (treated as "not found" by the caller).
  if v_phone is null or length(v_phone) < 7 then
    return;
  end if;

  select * into v_customer from public.customers where phone = v_phone;
  if not found then
    return;
  end if;

  -- Exactly one row: the customer's name plus their most-recent delivery
  -- (NULL delivery columns if they've only ever picked up). The lateral join
  -- keeps the name even when there's no delivery order to attach.
  return query
    select v_customer.name, o.delivery_city, o.delivery_address
    from (select 1) _
    left join lateral (
      select delivery_city, delivery_address
      from public.orders
      where customer_id = v_customer.id
        and fulfillment_type = 'delivery'
        and delivery_address is not null
      order by placed_at desc
      limit 1
    ) o on true;
end;
$$;

revoke all on function public.lookup_customer_by_phone(text) from public;
grant execute on function public.lookup_customer_by_phone(text)
  to anon, authenticated, service_role;
