-- War on Retail — link customers to Supabase auth users + customer dashboard.
--
-- The store has always been guest-first: `public.customers` is deduped by
-- `phone` and orders are placed anonymously via `place_order`. This migration
-- lets a customer optionally own an account WITHOUT breaking guest checkout:
--
--   1. Adds a nullable `customers.user_id` FK to auth.users. NOT unique — one
--      auth user may own several phone-keyed rows that share an email.
--   2. Read-only RLS so a signed-in customer can see their own profile, orders
--      and order items. Mutations still go through SECURITY DEFINER RPCs.
--   3. `link_customer_account()` — links the caller's existing customer rows by
--      verified email (called after sign-in / email-confirm).
--   4. `update_my_profile()` — lets a customer rename their linked rows.
--   5. `wishlist_items` — a per-user, DB-backed wishlist (replaces the
--      localStorage-only list for signed-in users), plus `merge_wishlist()`.

-- ========================================================================
--   1. customers.user_id
-- ========================================================================
alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists customers_user_id_idx on public.customers(user_id);

-- ========================================================================
--   2. Ownership helpers (SECURITY DEFINER → bypass RLS, no policy recursion)
-- ========================================================================
create or replace function public.uid_owns_customer(p_customer_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.customers
    where id = p_customer_id and user_id = auth.uid()
  );
$$;

create or replace function public.uid_owns_order(p_order_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = p_order_id and c.user_id = auth.uid()
  );
$$;

-- ========================================================================
--   3. Read-only RLS for the customer dashboard
-- ========================================================================
-- customers RLS is already enabled (no policies → anon blocked). We only add
-- SELECT policies scoped to the signed-in owner; all writes stay in RPCs.
drop policy if exists "customer reads own row" on public.customers;
create policy "customer reads own row"
  on public.customers for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "customer reads own orders" on public.orders;
create policy "customer reads own orders"
  on public.orders for select
  to authenticated
  using (public.uid_owns_order(id));

drop policy if exists "customer reads own order items" on public.order_items;
create policy "customer reads own order items"
  on public.order_items for select
  to authenticated
  using (public.uid_owns_order(order_id));

-- ========================================================================
--   4. link_customer_account()
-- ========================================================================
-- Called right after a customer establishes a verified session (sign-in or
-- email-confirm callback). Links every still-unowned customer row whose email
-- matches the caller's. SECURITY DEFINER so it can read auth.users, but it can
-- only ever act on `auth.uid()`'s own email — no parameters to abuse.
create or replace function public.link_customer_account()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid     uuid := auth.uid();
  v_email   text;
  v_linked  integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  select lower(email) into v_email from auth.users where id = v_uid;
  if v_email is null then
    return 0;
  end if;

  update public.customers
    set user_id = v_uid, updated_at = now()
    where lower(email) = v_email
      and user_id is null;
  get diagnostics v_linked = row_count;

  return v_linked;
end;
$$;

revoke all on function public.link_customer_account() from public, anon;
grant execute on function public.link_customer_account() to authenticated;

-- ========================================================================
--   5. update_my_profile()
-- ========================================================================
-- Renames the caller's linked customer rows. The auth-side display name lives
-- in user_metadata (set client-side via updateUser); this keeps the customer
-- rows (what admins + order receipts see) in step.
create or replace function public.update_my_profile(p_name text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_name    text := trim(coalesce(p_name, ''));
  v_updated integer := 0;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_name = '' then
    raise exception 'BAD_NAME: name is required';
  end if;

  update public.customers
    set name = v_name, updated_at = now()
    where user_id = v_uid;
  get diagnostics v_updated = row_count;

  return v_updated;
end;
$$;

revoke all on function public.update_my_profile(text) from public, anon;
grant execute on function public.update_my_profile(text) to authenticated;

-- ========================================================================
--   6. wishlist_items + merge_wishlist()
-- ========================================================================
create table if not exists public.wishlist_items (
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_slug text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, product_slug)
);

create index if not exists wishlist_items_user_idx on public.wishlist_items(user_id);

alter table public.wishlist_items enable row level security;

-- Owner-only: a signed-in customer manages exactly their own rows directly.
drop policy if exists "wishlist owner read" on public.wishlist_items;
create policy "wishlist owner read"
  on public.wishlist_items for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "wishlist owner insert" on public.wishlist_items;
create policy "wishlist owner insert"
  on public.wishlist_items for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "wishlist owner delete" on public.wishlist_items;
create policy "wishlist owner delete"
  on public.wishlist_items for delete
  to authenticated
  using (user_id = auth.uid());

-- Bulk-merge the guest's localStorage slugs into their account on login.
create or replace function public.merge_wishlist(p_slugs text[])
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
  if p_slugs is null or array_length(p_slugs, 1) is null then
    return 0;
  end if;

  insert into public.wishlist_items (user_id, product_slug)
    select v_uid, s
    from unnest(p_slugs) as s
    where s is not null and s <> ''
  on conflict (user_id, product_slug) do nothing;
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

revoke all on function public.merge_wishlist(text[]) from public, anon;
grant execute on function public.merge_wishlist(text[]) to authenticated;
