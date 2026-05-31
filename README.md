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
   - `20260101000700_promotions.sql`
   - `20260101000800_promotions_link.sql`
4. In **Storage**, create four public buckets: `product-images`, `brand-logos`, `category-images`, `promotions`.

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
# → http://localhost:3000/admin (sign in with email + password — bootstrap the
#   first admin with `npm run create-admin`; see "Add (or revoke) admins" below)
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
│   │   ├── login/                 # email + password sign-in (no chrome)
│   │   ├── auth/callback/         # OAuth / password-reset code-exchange route
│   │   ├── auth/reset-password/   # "set a new password" page (after reset email)
│   │   └── (panel)/               # authenticated admin pages (sidebar layout)
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

Sign-in is **email + password** (Supabase `signInWithPassword`). The source of
truth for `/admin` access is the `public.admin_users` table, which is
foreign-keyed to `auth.users`. `ADMIN_ALLOWED_EMAILS` remains as a bootstrap
hatch in case the DB row gets deleted.

**First admin (bootstrap, one-time):**
1. Make sure `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and
   `SUPABASE_SERVICE_ROLE_KEY`.
2. Run:
   ```bash
   npm run create-admin -- --email you@example.com --password 'StrongPass!1'
   # or interactively, with no flags:
   npm run create-admin
   ```
   The script creates the `auth.users` row with a known password (skipping the
   email-confirmation step) and calls `make_admin(email)` to promote the user.
3. Sign in at [/admin/login](http://localhost:3000/admin/login) with that email
   and password. You're persisted via the DB.

**Promote an existing auth user (no password set yet):**
1. In the Supabase dashboard, send the user an invite (Auth → Users → Invite),
   then run in the SQL editor once they've accepted:
   ```sql
   select make_admin('teammate@example.com', 'Their Full Name');
   -- or: select make_admin('owner@example.com', 'Owner', 'super_admin');
   ```
2. Have them open [/admin/login](http://localhost:3000/admin/login), click
   **Forgot your password?**, and set their password from the email link.

**Forgot/reset a password:**
On `/admin/login`, click **Forgot your password?**, enter the email, and follow
the link in the email. It lands on `/admin/auth/reset-password` (with a session
already attached) where the user picks a new password.

**Revoke (soft-delete, audit trail kept):**
```sql
select revoke_admin('former@example.com');
```

### Run a homepage sale

> 📖 Before designing the image, read [**docs/promotion-images.md**](docs/promotion-images.md)
> for recommended dimensions (2000×1250 for featured, 1200×675 for side tiles), safe-zone
> rules, and file-size budgets.

1. Go to `/admin/promotions` → **New promotion**.
2. Upload an image (16:10 recommended). The first promotion you mark **Featured** takes the
   large slot; the rest tile next to it.
3. Optionally set **Starts at** / **Ends at** so the sale auto-shows during the window and
   hides afterwards. Leave both blank to run indefinitely.
4. Save. The next homepage render (within ~60 s) replaces the red hero with your mosaic.
5. To end the sale early, edit the promo and uncheck **Active** (audit trail preserved) — or
   delete it.

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
