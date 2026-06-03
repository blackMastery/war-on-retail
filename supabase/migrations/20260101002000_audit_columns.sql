-- War on Retail — audit columns (who created / last modified a row)
--
-- The content tables already track WHEN a row changed (created_at / updated_at,
-- via set_updated_at). This adds WHO: created_by + modified_by.
--
-- These are stamped by the application, NOT a trigger: admin mutations run
-- through the service-role client (RLS-bypassing), so auth.uid() is NULL in any
-- trigger. The server action knows the admin (requirePageAccess → ctx.user.id)
-- and writes it into the payload. The only trigger here is `lock_created_by`,
-- which makes created_by immutable once set — a cheap integrity guard so an
-- UPDATE payload can never rewrite the original author.
--
-- Columns are plain uuid with NO foreign key (matching discount_codes.created_by):
-- env-bootstrap admins have an auth user but may have no admin_users row, so a
-- FK would reject their writes. Names are resolved best-effort at display time.

-- ---------------------------------------------------------------------------
-- (a) created_by / modified_by + lock_created_by on content tables
-- ---------------------------------------------------------------------------

create or replace function public.lock_created_by()
returns trigger
language plpgsql
as $$
begin
  -- created_by is set once at insert; never let an UPDATE change it.
  new.created_by := old.created_by;
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'products', 'categories', 'brands', 'faqs', 'promotions',
    'discount_codes', 'payment_methods', 'page_seo', 'store_settings'
  ]
  loop
    execute format(
      'alter table public.%I
         add column if not exists created_by  uuid,
         add column if not exists modified_by uuid;',
      t
    );
    execute format(
      'drop trigger if exists lock_created_by on public.%I;
       create trigger lock_created_by before update on public.%I
         for each row execute function public.lock_created_by();',
      t, t
    );
  end loop;
end$$;

-- ---------------------------------------------------------------------------
-- (b) Order status-change audit
-- ---------------------------------------------------------------------------
-- Orders are created by anonymous checkout, so created_by is meaningless here.
-- But approve/fulfill/cancel are admin actions — record the last admin to move
-- the status and when. No lock trigger: these are meant to change each time.

alter table public.orders
  add column if not exists status_updated_by uuid,
  add column if not exists status_updated_at timestamptz;
