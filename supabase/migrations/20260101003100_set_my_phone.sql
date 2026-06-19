-- War on Retail — let a signed-in customer set their phone from /account/settings.
--
-- Phone is the customers dedup key (unique, not null), so changing it can't be a
-- plain UPDATE through RLS. This SECURITY DEFINER RPC handles every case for the
-- caller (auth.uid()) only:
--   * phone already owned by someone else        → PHONE_TAKEN
--   * phone belongs to an unlinked guest row      → claim it (link to me)
--   * phone is free + I already have a row         → rename my primary row
--   * phone is free + I have no row yet            → create one (name from
--     auth metadata / email), realising the "add a phone in settings creates a
--     customer row" path.

create or replace function public.set_my_phone(p_phone text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid      uuid := auth.uid();
  v_phone    text := public.normalise_phone(p_phone);
  v_existing public.customers;
  v_primary  public.customers;
  v_email    text;
  v_name     text;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_phone is null or length(v_phone) < 7 then
    raise exception 'BAD_PHONE: phone is missing or too short';
  end if;

  select * into v_existing from public.customers where phone = v_phone;
  if found then
    if v_existing.user_id is not null and v_existing.user_id <> v_uid then
      raise exception 'PHONE_TAKEN: phone already linked to another account';
    end if;
    -- Mine already, or a free guest row I can adopt.
    if v_existing.user_id is null then
      update public.customers set user_id = v_uid, updated_at = now()
        where id = v_existing.id;
    end if;
    return v_phone;
  end if;

  -- Phone is free. Rename my primary (most-recent) row, or create one.
  select * into v_primary
    from public.customers
    where user_id = v_uid
    order by created_at desc
    limit 1;

  if found then
    update public.customers set phone = v_phone, updated_at = now()
      where id = v_primary.id;
    return v_phone;
  end if;

  select email, nullif(trim(coalesce(raw_user_meta_data->>'full_name', '')), '')
    into v_email, v_name
    from auth.users where id = v_uid;
  if v_name is null then
    v_name := nullif(split_part(coalesce(v_email, ''), '@', 1), '');
  end if;
  if v_name is null then
    v_name := 'Customer';
  end if;

  insert into public.customers (name, phone, email, user_id)
    values (v_name, v_phone, v_email, v_uid);

  return v_phone;
end;
$$;

revoke all on function public.set_my_phone(text) from public, anon;
grant execute on function public.set_my_phone(text) to authenticated;
