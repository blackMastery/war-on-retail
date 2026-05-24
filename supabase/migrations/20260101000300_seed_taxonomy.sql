-- War on Retail — seed taxonomy
-- Idempotent inserts for the categories and brands listed in the build plan §4.
-- Run this once; re-running is a no-op thanks to ON CONFLICT clauses.

-- ---------- top-level categories ----------
insert into public.categories (name, slug, display_order)
values
  ('Electronics',        'electronics',        10),
  ('Home Appliances',    'home-appliances',    20),
  ('Kitchen Appliances', 'kitchen-appliances', 30),
  ('Personal Care',      'personal-care',      40),
  ('Computing',          'computing',          50)
on conflict (slug) do nothing;

-- ---------- subcategories ----------
-- The select-into-from pattern keeps this idempotent without a CTE.
insert into public.categories (name, slug, parent_id, display_order)
select sub.name, sub.slug, parent.id, sub.display_order
from (values
  ('Televisions',       'televisions',       'electronics',        10),
  ('Audio Systems',     'audio-systems',     'electronics',        20),
  ('Home Theater',      'home-theater',      'electronics',        30),
  ('Refrigerators',     'refrigerators',     'home-appliances',    10),
  ('Washing Machines',  'washing-machines',  'home-appliances',    20),
  ('Dryers',            'dryers',            'home-appliances',    30),
  ('Microwaves',        'microwaves',        'home-appliances',    40),
  ('Air Conditioners',  'air-conditioners',  'home-appliances',    50),
  ('Blenders',          'blenders',          'kitchen-appliances', 10),
  ('Mixers',            'mixers',            'kitchen-appliances', 20),
  ('Coffee Makers',     'coffee-makers',     'kitchen-appliances', 30),
  ('Toasters',          'toasters',          'kitchen-appliances', 40),
  ('Hair Dryers',       'hair-dryers',       'personal-care',      10),
  ('Shavers',           'shavers',           'personal-care',      20),
  ('Grooming Kits',     'grooming-kits',     'personal-care',      30),
  ('Laptops',           'laptops',           'computing',          10),
  ('Desktops',          'desktops',          'computing',          20),
  ('Printers',          'printers',          'computing',          30),
  ('Accessories',       'accessories',       'computing',          40)
) as sub(name, slug, parent_slug, display_order)
join public.categories parent on parent.slug = sub.parent_slug
on conflict (slug) do nothing;

-- ---------- brands ----------
insert into public.brands (name, slug, display_order)
values
  ('Samsung',    'samsung',    10),
  ('LG',         'lg',         20),
  ('Sony',       'sony',       30),
  ('Whirlpool',  'whirlpool',  40),
  ('Frigidaire', 'frigidaire', 50),
  ('Panasonic',  'panasonic',  60),
  ('Philips',    'philips',    70),
  ('HP',         'hp',         80),
  ('Dell',       'dell',       90),
  ('Canon',      'canon',      100),
  ('Apple',      'apple',      110),
  ('Lenovo',     'lenovo',     120)
on conflict (slug) do nothing;

-- ---------- FAQ categories ----------
insert into public.faq_categories (name, slug, display_order)
values
  ('Shipping & Delivery', 'shipping',  10),
  ('Returns & Warranty',  'returns',   20),
  ('Payment',             'payment',   30),
  ('Products',            'products',  40),
  ('Account & Orders',    'account',   50)
on conflict (slug) do nothing;

-- ---------- starter FAQs (chatbot training seed) ----------
insert into public.faqs (category_id, question, answer, keywords)
select c.id, q.question, q.answer, q.keywords
from (values
  ('shipping',
   'Do you deliver throughout Guyana?',
   'Yes — we deliver across Guyana. Georgetown deliveries usually arrive in 24 hours; outside Georgetown typically takes 2–5 business days depending on location.',
   array['delivery','shipping','guyana','georgetown']),
  ('shipping',
   'How much does delivery cost?',
   'Delivery within Georgetown is free on orders over GYD $20,000. Outside Georgetown, delivery fees are calculated at checkout based on location and item size.',
   array['delivery cost','shipping fee','free delivery']),
  ('returns',
   'What is your return policy?',
   'You can return most items within 7 days of delivery if they are unused and in original packaging. Contact us on WhatsApp at 592-694-3827 to start a return.',
   array['return','refund','exchange']),
  ('returns',
   'Do products come with a warranty?',
   'Yes — all products carry the manufacturer''s warranty. Warranty length varies by product and is shown on each product page.',
   array['warranty','manufacturer','guarantee']),
  ('payment',
   'What payment methods do you accept?',
   'We accept cash on delivery, bank transfer, and major debit/credit cards. Mobile money options are coming soon.',
   array['payment','cash','card','bank transfer','mmg']),
  ('products',
   'Are your products original?',
   'Yes — every product we sell is 100% authentic and sourced directly from manufacturers or authorised distributors.',
   array['authentic','original','genuine','fake']),
  ('account',
   'How do I track my order?',
   'After your order ships you''ll receive a WhatsApp message with tracking details. You can also reply to that message any time for an update.',
   array['track','order status','where is my order'])
) as q(cat_slug, question, answer, keywords)
join public.faq_categories c on c.slug = q.cat_slug
on conflict do nothing;
