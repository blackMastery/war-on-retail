-- Seed a store-hours FAQ so keyword matching and LLM context cover schedule questions.
-- The chatbot also answers schedule queries from live store_settings; this FAQ is a
-- fallback when phrasing doesn't hit the in-code matcher.

insert into public.faq_categories (name, slug, display_order)
values ('Store Info', 'store', 5)
on conflict (slug) do nothing;

insert into public.faqs (category_id, question, answer, keywords)
select c.id, q.question, q.answer, q.keywords
from (values
  ('store',
   'What are your opening hours?',
   'Mon–Fri 9:00 AM – 6:00 PM. Sat 9:00 AM – 4:00 PM. Sun Closed.',
   array['hours','open','opening','close','closing','time','sunday','saturday','weekday','when'])
) as q(cat_slug, question, answer, keywords)
join public.faq_categories c on c.slug = q.cat_slug
on conflict do nothing;
