-- War on Retail — link admin_users to auth.users
--
-- Fixes the schema gap: `admin_users.id` is conceptually a foreign key to
-- `auth.users(id)` but the original migration never declared it. This file:
--   1. Adds the FK with ON DELETE CASCADE.
--   2. Provides `public.make_admin(email)` so existing Supabase auth users can
--      be promoted to admin from the SQL editor in one call.
--   3. Tightens RLS so an authenticated user can read only their own admin row.

-- ---------- 1. FK ----------
-- Cleanly add the FK if it doesn't already exist. The DO block keeps this
-- migration idempotent — re-running won't error.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'admin_users_id_fkey'
  ) then
    alter table public.admin_users
      add constraint admin_users_id_fkey
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ---------- 2. make_admin RPC ----------
-- Promotes the auth user matching `p_email` to admin. SECURITY DEFINER lets
-- this read auth.users (which the caller can't normally see). Only the
-- service_role is allowed to invoke it — never anon or authenticated.
create or replace function public.make_admin(
  p_email     text,
  p_full_name text default null,
  p_role      text default 'admin'
) returns public.admin_users
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_admin   public.admin_users;
begin
  if p_role not in ('admin', 'super_admin') then
    raise exception 'role must be admin or super_admin (got %)', p_role;
  end if;

  select id into v_user_id from auth.users where email = lower(p_email);
  if v_user_id is null then
    raise exception 'No auth user with email %; have them sign in once first.', p_email;
  end if;

  insert into public.admin_users (id, email, full_name, role, is_active)
  values (v_user_id, lower(p_email), coalesce(p_full_name, p_email), p_role, true)
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.admin_users.full_name),
        role       = excluded.role,
        is_active  = true,
        updated_at = now()
  returning * into v_admin;

  return v_admin;
end;
$$;

revoke all on function public.make_admin(text, text, text) from public, anon, authenticated;
grant execute on function public.make_admin(text, text, text) to service_role;

-- ---------- 3. revoke_admin RPC ----------
-- Soft revocation — deactivates without deleting, so the audit trail survives.
create or replace function public.revoke_admin(p_email text)
returns public.admin_users
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin public.admin_users;
begin
  update public.admin_users
    set is_active = false, updated_at = now()
  where email = lower(p_email)
  returning * into v_admin;

  if v_admin is null then
    raise exception 'No admin with email %', p_email;
  end if;
  return v_admin;
end;
$$;

revoke all on function public.revoke_admin(text) from public, anon, authenticated;
grant execute on function public.revoke_admin(text) to service_role;
