-- War on Retail — teardown
-- Drops every object created by the migrations in this folder. Run this ONCE
-- in the Supabase SQL editor when you want a clean re-push, then re-run
-- `./scripts/db-push.sh`. Safe to run repeatedly — every drop uses IF EXISTS.
--
-- Does NOT touch auth.*, storage.*, or any Supabase-managed schema.

-- Drop tables (cascade clears FKs, indexes, triggers, and policies).
drop table if exists public.chatbot_conversations cascade;
drop table if exists public.faqs                  cascade;
drop table if exists public.faq_categories        cascade;
drop table if exists public.product_variants      cascade;
drop table if exists public.products              cascade;
drop table if exists public.brands                cascade;
drop table if exists public.categories            cascade;
drop table if exists public.admin_users           cascade;

-- Drop functions we created.
drop function if exists public.search_products(text, integer, integer);
drop function if exists public.sync_product_variant_aggregates() cascade;
drop function if exists public.set_updated_at() cascade;

-- Clear out the storage.objects policies our migrations installed.
drop policy if exists "public read product-images"  on storage.objects;
drop policy if exists "public read brand-logos"     on storage.objects;
drop policy if exists "public read category-images" on storage.objects;

-- Clear the migration ledger so `db push` re-applies everything fresh.
-- The supabase_migrations schema is created by the CLI; the table won't exist
-- on a brand-new project, hence IF EXISTS.
delete from supabase_migrations.schema_migrations
where version in (
  '20260101000000',
  '20260101000100',
  '20260101000200',
  '20260101000300',
  '20260101000400',
  '20260101000500'
);
