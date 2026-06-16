-- War on Retail — surface a MASKED email in the returning-customer lookup
--
-- "Find my info" now also tells a returning customer that we have an email on
-- file — but only a masked form (e.g. j••@gmail.com), never the full address.
--
-- Why masked: lookup_customer_by_phone is a SECURITY DEFINER RPC granted to
-- anon, so anyone can call it with any phone number. Returning the real email
-- would let a caller harvest the address behind a known/guessed phone. The mask
-- is display-only — enough for the real owner to recognise their own address.
-- The checkout never prefills it; if the customer leaves the email field blank,
-- place_order's `coalesce(excluded.email, customers.email)` keeps the stored one.

drop function if exists public.lookup_customer_by_phone(text);

create function public.lookup_customer_by_phone(p_phone text)
returns table (
  name                 text,
  email_masked         text,
  last_delivery_city   text,
  last_delivery_address text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone        text := public.normalise_phone(p_phone);
  v_customer     public.customers;
  v_at           int;
  v_email_masked text;
begin
  -- Too short / blank → empty result (treated as "not found" by the caller).
  if v_phone is null or length(v_phone) < 7 then
    return;
  end if;

  select * into v_customer from public.customers where phone = v_phone;
  if not found then
    return;
  end if;

  -- Mask the email to "<first char>••@<domain>". Only when it looks like an
  -- address with a non-empty local part; otherwise leave NULL.
  if v_customer.email is not null then
    v_at := position('@' in v_customer.email);
    if v_at > 1 then
      v_email_masked := left(v_customer.email, 1) || '••'
        || substring(v_customer.email from v_at);
    end if;
  end if;

  -- Exactly one row: the customer's name, a masked email hint, plus their
  -- most-recent delivery (NULL delivery columns if they've only ever picked
  -- up). The lateral join keeps the row even when there's no delivery to attach.
  return query
    select v_customer.name, v_email_masked, o.delivery_city, o.delivery_address
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
