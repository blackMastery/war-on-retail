-- War on Retail — per-page access control for admins
--
-- Adds a grant table linking an admin_users row to the admin sections they may
-- access. A `super_admin` ignores this table entirely (full access); a regular
-- `admin` may only enter the sections they have a row for. Presence of a
-- (admin_user_id, page_key) row = access granted; no row = denied.
--
-- `page_key` values are defined in code (src/lib/admin/pages.ts) rather than a
-- DB enum so the section list can evolve without a migration.

create table if not exists public.admin_user_pages (
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  page_key      text not null,
  created_at    timestamptz not null default now(),
  primary key (admin_user_id, page_key)
);

create index if not exists admin_user_pages_user_idx
  on public.admin_user_pages (admin_user_id);

alter table public.admin_user_pages enable row level security;

-- Authenticated users may read only their own grants (mirrors the admin_users
-- self-read policy in 20260101000600). All writes go through the service-role
-- client in server actions, which bypasses RLS.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_user_pages'
      and policyname = 'admin_user_pages_self_read'
  ) then
    create policy admin_user_pages_self_read on public.admin_user_pages
      for select to authenticated
      using (admin_user_id = auth.uid());
  end if;
end $$;
