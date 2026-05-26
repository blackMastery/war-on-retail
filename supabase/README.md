# Supabase setup

Apply these migrations in order, either via the Supabase CLI or by pasting each file into the SQL editor.

```bash
# CLI (recommended)
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

| # | File | Purpose |
|---|------|---------|
| 1 | `20260101000000_init_schema.sql` | Tables, indexes, updated_at triggers |
| 2 | `20260101000100_rls_policies.sql` | Row-level security |
| 3 | `20260101000200_storage_buckets.sql` | Storage policies (create buckets in dashboard first) |
| 4 | `20260101000300_seed_taxonomy.sql` | Categories, brands, FAQs |
| 5 | `20260101000400_seed_sample_products.sql` | Demo products so the store renders |
| 6 | `20260101000500_search_function.sql` | `search_products` RPC |
| 7 | `20260101000600_admin_users_auth_link.sql` | FK to `auth.users` + `make_admin` / `revoke_admin` RPCs |
| 8 | `20260101000700_promotions.sql` | Homepage specials/promotions table + storage policy |
| 9 | `20260101000800_promotions_link.sql` | Adds `link_url` to promotions (click target) |

After migrations, create the four storage buckets from the Supabase dashboard:

- `product-images` — public
- `brand-logos` — public
- `category-images` — public
- `promotions` — public
