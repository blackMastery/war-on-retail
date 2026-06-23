-- War on Retail — verified-purchase product reviews with admin moderation.
--
-- Customers who bought a product on a fulfilled order may submit one review
-- per product. Reviews start as `pending` and only `approved` rows are public.

-- ========================================================================
--   1. product_reviews
-- ========================================================================
create table if not exists public.product_reviews (
  id           uuid primary key default uuid_generate_v4(),
  product_id   uuid not null references public.products(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  rating       integer not null check (rating between 1 and 5),
  body         text not null check (char_length(trim(body)) between 10 and 2000),
  reviewer_name text not null default 'Verified buyer',
  status       text not null default 'pending'
                 check (status in ('pending', 'approved', 'rejected')),
  reviewed_by  uuid references auth.users(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists product_reviews_product_status_idx
  on public.product_reviews(product_id, status);

create index if not exists product_reviews_status_created_idx
  on public.product_reviews(status, created_at desc);

-- ========================================================================
--   2. user_purchased_product()
-- ========================================================================
create or replace function public.user_purchased_product(p_product_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.customers c on c.id = o.customer_id
    where c.user_id = auth.uid()
      and o.status = 'fulfilled'
      and oi.product_id = p_product_id
  );
$$;

revoke all on function public.user_purchased_product(uuid) from public;
grant execute on function public.user_purchased_product(uuid) to authenticated;

-- ========================================================================
--   3. submit_product_review()
-- ========================================================================
create or replace function public.submit_product_review(
  p_product_id uuid,
  p_rating     integer,
  p_body       text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid      uuid := auth.uid();
  v_body     text := trim(coalesce(p_body, ''));
  v_id       uuid;
  v_existing public.product_reviews%rowtype;
  v_name     text := 'Verified buyer';
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_product_id is null then
    raise exception 'BAD_PRODUCT: product is required';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'BAD_RATING: rating must be between 1 and 5';
  end if;

  if char_length(v_body) < 10 then
    raise exception 'BAD_BODY: review must be at least 10 characters';
  end if;

  if char_length(v_body) > 2000 then
    raise exception 'BAD_BODY: review must be at most 2000 characters';
  end if;

  if not exists (
    select 1 from public.products where id = p_product_id and is_active = true
  ) then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not public.user_purchased_product(p_product_id) then
    raise exception 'NOT_PURCHASED';
  end if;

  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(c.name), ''),
    'Verified buyer'
  )
  into v_name
  from auth.users u
  left join lateral (
    select name from public.customers where user_id = v_uid order by updated_at desc limit 1
  ) c on true
  where u.id = v_uid;

  select * into v_existing
  from public.product_reviews
  where user_id = v_uid and product_id = p_product_id;

  if found then
    update public.product_reviews
      set rating = p_rating,
          body = v_body,
          reviewer_name = v_name,
          status = 'pending',
          reviewed_by = null,
          reviewed_at = null,
          updated_at = now()
    where id = v_existing.id
    returning id into v_id;
  else
    insert into public.product_reviews (product_id, user_id, rating, body, reviewer_name)
    values (p_product_id, v_uid, p_rating, v_body, v_name)
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

revoke all on function public.submit_product_review(uuid, integer, text) from public, anon;
grant execute on function public.submit_product_review(uuid, integer, text) to authenticated;

-- ========================================================================
--   4. RLS
-- ========================================================================
alter table public.product_reviews enable row level security;

drop policy if exists "public read approved reviews" on public.product_reviews;
create policy "public read approved reviews"
  on public.product_reviews for select
  to anon, authenticated
  using (status = 'approved');

drop policy if exists "owner read own reviews" on public.product_reviews;
create policy "owner read own reviews"
  on public.product_reviews for select
  to authenticated
  using (user_id = auth.uid());
