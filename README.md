# War on Retail

E-commerce platform with an AI assistant — Next.js (App Router) + Supabase + Tailwind.
Built from `War_on_Retail_Production_Build_Plan.md`.

## What's in here

**Storefront** (`src/app/(customer)/`)
- Homepage with hero, category grid, featured products, brand strip
- Product listing (`/products`), category and brand landing pages
- Product detail page with gallery, specs table, related items, WhatsApp inquiry button
- Full-text search (`/search?q=…`), deals (`/deals`), FAQ, contact, about
- Sticky header with mobile nav, footer, persistent AI chat widget

**Admin panel** (`src/app/admin/`)
- Magic-link sign-in gated by an `ADMIN_ALLOWED_EMAILS` allow-list
- Dashboard with counts, low-stock list, recent chat conversations
- Product CRUD via server actions, paginated table with search
- CSV import (papaparse → idempotent upsert by slug)
- Category and brand views, FAQ editor for chatbot training

**AI chatbot** (`src/lib/ai/chatbot.ts`, `src/app/api/chatbot/route.ts`)
- FAQ-first keyword retrieval; falls back to Anthropic Claude Haiku 4.5
- Product context injected via the Postgres `search_products` RPC
- Conversation logging to `chatbot_conversations` for review
- In-process per-IP rate limit (20 req/min)

**Database** (`supabase/migrations/`)
- Schema, RLS, storage policies, seeded taxonomy (categories/brands/FAQs), sample products,
  and the `search_products` full-text RPC

## Setup

### 1. Install
```bash
npm install
```

### 2. Supabase project
1. Create a project at https://supabase.com
2. From **Project Settings → API**, copy the `URL`, `anon`/`publishable` key, and `service_role` key.
3. In the SQL editor, run each file in `supabase/migrations/` **in order**:
   - `20260101000000_init_schema.sql`
   - `20260101000100_rls_policies.sql`
   - `20260101000200_storage_buckets.sql`
   - `20260101000300_seed_taxonomy.sql`
   - `20260101000400_seed_sample_products.sql`
   - `20260101000500_search_function.sql`
   - `20260101000600_admin_users_auth_link.sql`
4. In **Storage**, create three public buckets: `product-images`, `brand-logos`, `category-images`.

(Or use the Supabase CLI: `supabase link --project-ref … && supabase db push`.)

### 3. Environment
```bash
cp .env.local.example .env.local
# fill in Supabase keys, ANTHROPIC_API_KEY, ADMIN_ALLOWED_EMAILS
```

### 4. Run
```bash
npm run dev
# → http://localhost:3000
# → http://localhost:3000/admin (sign in with an email in ADMIN_ALLOWED_EMAILS)
```

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind CSS |
| DB / auth / storage | Supabase (Postgres + RLS) |
| Supabase client | `@supabase/ssr` |
| AI | `@anthropic-ai/sdk` (Claude Haiku 4.5) |
| Validation | Zod |
| CSV | papaparse |

> The original plan referenced `@supabase/auth-helpers-nextjs`, which Supabase has
> deprecated in favour of `@supabase/ssr`. This project uses the current package.
> The plan also targeted Next.js 14; the install was bumped to Next.js 16 because
> 14.2.18 carries a security advisory. The App Router code is compatible (async
> `cookies()` and `params` are already in use).

## Project layout

```
src/
├── app/
│   ├── (customer)/        # public storefront (route group)
│   ├── admin/
│   │   ├── login/         # magic-link sign-in (no chrome)
│   │   ├── auth/callback/ # OTP callback route
│   │   └── (panel)/       # authenticated admin pages (sidebar layout)
│   ├── api/chatbot/       # POST endpoint for the chat widget
│   ├── layout.tsx
│   ├── globals.css
│   └── not-found.tsx
├── components/
│   ├── customer/          # Header, Footer, ProductCard, Chatbot, …
│   └── admin/             # Sidebar, ProductForm
├── lib/
│   ├── supabase/{client,server,admin,middleware}.ts
│   ├── admin/auth.ts      # requireAdmin guard
│   ├── ai/chatbot.ts      # FAQ retrieval + Anthropic fallback
│   └── utils.ts
├── config/{site,navigation}.ts
├── types/database.ts      # Typed Database schema
└── middleware.ts          # Refreshes Supabase session, gates /admin

supabase/migrations/       # SQL — apply in filename order
```

## Common tasks

### Add (or revoke) admins

The source of truth for `/admin` access is the `public.admin_users` table, which
is foreign-keyed to `auth.users`. `ADMIN_ALLOWED_EMAILS` is only a bootstrap
hatch for the very first admin.

**First admin (bootstrap, one-time):**
1. Put your email in `ADMIN_ALLOWED_EMAILS` in `.env.local`.
2. Sign in once at [/admin/login](http://localhost:3000/admin/login) — magic link.
3. Inside the panel you'll see a yellow "Bootstrap access" banner with the exact
   SQL to run. Paste it into the Supabase **SQL editor**:
   ```sql
   select make_admin('you@example.com');
   ```
4. Remove your email from `ADMIN_ALLOWED_EMAILS` and restart `npm run dev`.
   You're now persisted via the DB.

**Promote another user:**
1. Have them sign in once at `/admin/login` so a row appears in `auth.users`.
   (They'll bounce off the not-authorised page; that's fine — the auth row gets
   created on the magic-link request.)
2. In the SQL editor:
   ```sql
   select make_admin('teammate@example.com', 'Their Full Name');
   -- or: select make_admin('owner@example.com', 'Owner', 'super_admin');
   ```

**Revoke (soft-delete, audit trail kept):**
```sql
select revoke_admin('former@example.com');
```

### Add products in bulk
1. Go to `/admin/products/import`.
2. Upload a CSV. Required columns: `name`, `price`. See the page for the full schema and a sample row.
3. Rows are upserted by `slug`; existing slugs are updated, new ones inserted.

### Train the chatbot
1. Go to `/admin/chatbot`.
2. Add FAQs (question + answer + keywords). Keywords boost retrieval relevance.
3. Watch the recent conversations list to find new questions worth adding.

### Add product images
Upload to the `product-images` Supabase Storage bucket, then paste the public URL into the
"Featured image URL" field on a product. (Drag-and-drop upload UI is on the roadmap.)

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run type-check` | `tsc --noEmit` |
| `npm run format` | Prettier |

## Roadmap

- Inline edit/create for categories, brands, FAQ categories
- Drag-and-drop image upload to Supabase Storage in the product form
- Cart + checkout (current flow routes purchase intent to WhatsApp)
- Order management
- Analytics beyond the current dashboard counts
