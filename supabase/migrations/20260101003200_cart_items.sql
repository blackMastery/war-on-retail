-- War on Retail — DB-backed cart for signed-in customers.
--
-- Guests keep using localStorage; on sign-in the client calls `merge_cart()`
-- to fold guest lines into the account cart, then mirrors the canonical DB
-- list back into the Zustand store (same pattern as wishlist_items).

-- ========================================================================
--   1. cart_items
-- ========================================================================
create table if not exists public.cart_items (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists cart_items_user_idx on public.cart_items(user_id);

alter table public.cart_items enable row level security;

drop policy if exists "cart owner read" on public.cart_items;
create policy "cart owner read"
  on public.cart_items for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "cart owner insert" on public.cart_items;
create policy "cart owner insert"
  on public.cart_items for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "cart owner update" on public.cart_items;
create policy "cart owner update"
  on public.cart_items for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "cart owner delete" on public.cart_items;
create policy "cart owner delete"
  on public.cart_items for delete
  to authenticated
  using (user_id = auth.uid());

-- ========================================================================
--   2. merge_cart()
-- ========================================================================
-- Bulk-merge the guest's localStorage cart into the caller's account on login.
-- Sums quantities when the same product already exists. Skips inactive or
-- missing products.
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

  insert into public.cart_items (user_id, product_id, quantity)
    select
      v_uid,
      (item->>'product_id')::uuid,
      (item->>'quantity')::integer
    from jsonb_array_elements(p_items) as item
    where (item->>'product_id') is not null
      and (item->>'quantity')::integer > 0
      and exists (
        select 1 from public.products p
        where p.id = (item->>'product_id')::uuid
          and p.is_active = true
      )
  on conflict (user_id, product_id) do update
    set quantity   = cart_items.quantity + excluded.quantity,
        updated_at = now();
  get diagnostics v_count = row_count;

  return v_count;
end;
$$;

revoke all on function public.merge_cart(jsonb) from public, anon;
grant execute on function public.merge_cart(jsonb) to authenticated;
