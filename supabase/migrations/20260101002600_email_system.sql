-- War on Retail — email notification system
--
-- Three pieces:
--   1. customers.email   — nullable. The store is phone/WhatsApp-centric, so
--      checkout never asks for an email. Admins add it from the order screen
--      when a customer wants email receipts. No unique constraint: phone stays
--      the identity key; email is best-effort contact info only.
--   2. email_templates   — admin-editable subject + HTML body, keyed by a stable
--      `slug`. `is_system` rows back the automatic order emails and cannot be
--      deleted (but can be freely edited). Bodies use the same {{placeholder}}
--      convention as page bodies (see src/lib/page-body.ts) — e.g.
--      {{customer_name}}, {{order_number}}, {{order_items}}.
--   3. email_log         — one row per send attempt (sent / failed / logged).
--      `logged` is the dev fallback when RESEND_API_KEY is absent: we record the
--      intent without actually delivering. Doubles as the admin "Recent emails".
--
-- RLS: email_templates and email_log are admin-only (no public policies),
-- matching the customers table. All access is via the service-role client.

-- ---------------------------------------------------------------------------
-- 1. customers.email
-- ---------------------------------------------------------------------------

alter table public.customers
  add column if not exists email text;

-- ---------------------------------------------------------------------------
-- 2. email_templates
-- ---------------------------------------------------------------------------

create table if not exists public.email_templates (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  subject     text not null,
  body_html   text not null default '',
  is_active   boolean not null default true,
  -- System templates back the automatic order emails. Editable, never deletable.
  is_system   boolean not null default false,
  created_by  uuid,
  modified_by uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists email_templates_active_idx
  on public.email_templates(is_active);

drop trigger if exists set_updated_at on public.email_templates;
create trigger set_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

-- created_by is immutable once set (matches the other content tables).
drop trigger if exists lock_created_by on public.email_templates;
create trigger lock_created_by before update on public.email_templates
  for each row execute function public.lock_created_by();

alter table public.email_templates enable row level security;
-- No public policies → anon blocked. Admin reads/writes use the service-role
-- client, which bypasses RLS.

-- ---------------------------------------------------------------------------
-- 3. email_log
-- ---------------------------------------------------------------------------

create table if not exists public.email_log (
  id            uuid primary key default uuid_generate_v4(),
  template_slug text,
  to_email      text not null,
  subject       text not null,
  -- 'sent'   → delivered to Resend (provider_id holds the message id)
  -- 'failed' → attempted but errored (error holds the reason)
  -- 'logged' → dev fallback: no API key, recorded but not delivered
  status        text not null check (status in ('sent', 'failed', 'logged')),
  provider_id   text,
  error         text,
  order_id      uuid references public.orders(id) on delete set null,
  created_by    uuid,
  created_at    timestamptz not null default now()
);

create index if not exists email_log_created_at_idx
  on public.email_log(created_at desc);
create index if not exists email_log_order_idx
  on public.email_log(order_id);

alter table public.email_log enable row level security;
-- Admin-only, same as email_templates.

-- ---------------------------------------------------------------------------
-- 4. Seed the system templates
-- ---------------------------------------------------------------------------
-- Simple, deliberately plain bodies — the branded shell (header/footer) is
-- added at render time by src/lib/email/render.ts, so these only describe the
-- message itself. Admins can rewrite any of them from /admin/email-templates.

insert into public.email_templates (slug, name, subject, body_html, is_system) values
  (
    'order_confirmation',
    'Order confirmation',
    'We received your order {{order_number}}',
    '<p>Hi {{customer_name}},</p>'
      || '<p>Thanks for your order! We''ve received <strong>{{order_number}}</strong> placed on {{order_date}} and are getting it ready.</p>'
      || '<h3>Your items</h3>{{order_items}}'
      || '<p><strong>Total: {{order_total}}</strong></p>'
      || '<p>We''ll be in touch on {{site_phone}} to confirm payment and delivery. Questions? Reply to this email or message us on WhatsApp.</p>',
    true
  ),
  (
    'order_approved',
    'Order approved',
    'Your order {{order_number}} is approved',
    '<p>Hi {{customer_name}},</p>'
      || '<p>Good news — your order <strong>{{order_number}}</strong> has been approved and is now being prepared.</p>'
      || '<h3>Your items</h3>{{order_items}}'
      || '<p><strong>Total: {{order_total}}</strong></p>'
      || '<p>We''ll let you know as soon as it''s on the way or ready for pickup.</p>',
    true
  ),
  (
    'order_fulfilled',
    'Order fulfilled',
    'Your order {{order_number}} is on its way',
    '<p>Hi {{customer_name}},</p>'
      || '<p>Your order <strong>{{order_number}}</strong> has been fulfilled. Thank you for shopping with {{site_name}}!</p>'
      || '<h3>Your items</h3>{{order_items}}'
      || '<p><strong>Total: {{order_total}}</strong></p>'
      || '<p>If anything isn''t right, reply to this email and we''ll make it good.</p>',
    true
  ),
  (
    'order_cancelled',
    'Order cancelled',
    'Your order {{order_number}} was cancelled',
    '<p>Hi {{customer_name}},</p>'
      || '<p>Your order <strong>{{order_number}}</strong> has been cancelled. If this was a mistake or you''d like to reorder, just reply to this email or message us on WhatsApp at {{site_phone}}.</p>',
    true
  ),
  (
    'welcome',
    'Welcome',
    'Welcome to {{site_name}}',
    '<p>Hi {{customer_name}},</p>'
      || '<p>Welcome to {{site_name}} — your trusted spot for electronics and home appliances. We''re glad to have you.</p>'
      || '<p>Browse the latest deals any time, and reach us on {{site_phone}} if you need a hand.</p>',
    true
  )
on conflict (slug) do nothing;
