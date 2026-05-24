-- War on Retail — Row Level Security
-- Public can READ active rows. Mutations go through the service-role key
-- (server-only) and are gated in app code by ADMIN_ALLOWED_EMAILS.

alter table public.categories             enable row level security;
alter table public.brands                 enable row level security;
alter table public.products               enable row level security;
alter table public.faq_categories         enable row level security;
alter table public.faqs                   enable row level security;
alter table public.chatbot_conversations  enable row level security;
alter table public.admin_users            enable row level security;

-- ---------- public read (active rows only) ----------
drop policy if exists "public read active categories" on public.categories;
create policy "public read active categories"
  on public.categories for select
  using (is_active = true);

drop policy if exists "public read active brands" on public.brands;
create policy "public read active brands"
  on public.brands for select
  using (is_active = true);

drop policy if exists "public read active products" on public.products;
create policy "public read active products"
  on public.products for select
  using (is_active = true);

drop policy if exists "public read faq categories" on public.faq_categories;
create policy "public read faq categories"
  on public.faq_categories for select
  using (true);

drop policy if exists "public read active faqs" on public.faqs;
create policy "public read active faqs"
  on public.faqs for select
  using (is_active = true);

-- ---------- chatbot conversations ----------
-- Anyone (anon) may insert; only service role reads.
drop policy if exists "anon insert chatbot conversations" on public.chatbot_conversations;
create policy "anon insert chatbot conversations"
  on public.chatbot_conversations for insert
  with check (true);

-- ---------- admin users ----------
-- Only an authenticated user looking up their own admin row can read it.
drop policy if exists "self read admin user" on public.admin_users;
create policy "self read admin user"
  on public.admin_users for select
  using (auth.uid() = id);
