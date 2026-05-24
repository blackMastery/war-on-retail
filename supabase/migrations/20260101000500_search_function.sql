-- War on Retail — full-text product search RPC
-- Wraps the GIN tsvector index from 20260101000000_init_schema.sql in an
-- RPC so the client can call it without crafting SQL.

create or replace function public.search_products(
  q          text,
  max_rows   integer default 24,
  page_offset integer default 0
) returns setof public.products
language sql
stable
as $$
  select p.*
  from public.products p
  where p.is_active = true
    and (
      q is null
      or q = ''
      or to_tsvector(
           'english',
           coalesce(p.name, '') || ' ' ||
           coalesce(p.short_description, '') || ' ' ||
           coalesce(p.description, '') || ' ' ||
           coalesce(p.sku, '')
         ) @@ plainto_tsquery('english', q)
    )
  order by
    ts_rank(
      to_tsvector(
        'english',
        coalesce(p.name, '') || ' ' ||
        coalesce(p.short_description, '') || ' ' ||
        coalesce(p.description, '') || ' ' ||
        coalesce(p.sku, '')
      ),
      plainto_tsquery('english', coalesce(q, ''))
    ) desc,
    p.is_featured desc,
    p.created_at desc
  limit greatest(1, least(max_rows, 100))
  offset greatest(0, page_offset);
$$;

grant execute on function public.search_products(text, integer, integer) to anon, authenticated;
