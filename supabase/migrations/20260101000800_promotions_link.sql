-- War on Retail — promotion click targets
--
-- Adds `link_url` to promotions so an admin can point each banner at a
-- product, category, or external URL. NULL = display-only (current behaviour).
--
-- Idempotent: re-running this migration is a no-op once the column exists.

alter table public.promotions
  add column if not exists link_url text;

-- Soft sanity check at the DB level. We allow:
--   - Internal paths starting with "/"            (e.g. /products/foo)
--   - Absolute https:// or http:// URLs
--   - NULL (display-only)
-- Anything else (mailto:, javascript:, tel:, file:, …) is rejected so a stray
-- paste can't escape the storefront.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'promotions_link_url_shape'
  ) then
    alter table public.promotions
      add constraint promotions_link_url_shape
      check (
        link_url is null
        or link_url ~ '^/[^[:space:]]*$'
        or link_url ~ '^https?://[^[:space:]]+$'
      );
  end if;
end $$;
