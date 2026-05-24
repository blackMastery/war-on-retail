#!/usr/bin/env bash
# Apply all migrations in supabase/migrations/ to the linked Supabase project.
# Password is prompted interactively and never written to disk or stdout.

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT_REF="qeuhdvdjmpakhomqlifu"

if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ supabase CLI not found. Install with: brew install supabase/tap/supabase" >&2
  exit 1
fi

# Use SUPABASE_DB_PASSWORD if already set in the env, otherwise prompt.
if [[ -z "${SUPABASE_DB_PASSWORD:-}" ]]; then
  read -r -s -p "Supabase DB password (Project Settings → Database → Connection string): " SUPABASE_DB_PASSWORD
  echo
  export SUPABASE_DB_PASSWORD
fi

echo "› Linking to project ${PROJECT_REF}…"
supabase link --project-ref "$PROJECT_REF" --password "$SUPABASE_DB_PASSWORD" >/dev/null

echo "› Pushing migrations…"
supabase db push --password "$SUPABASE_DB_PASSWORD"

cat <<'EOF'

✓ Migrations applied.

Next: create the three public storage buckets in the dashboard
  https://app.supabase.com/project/_/storage/buckets

  • product-images
  • brand-logos
  • category-images

Then start the dev server with: npm run dev
EOF
