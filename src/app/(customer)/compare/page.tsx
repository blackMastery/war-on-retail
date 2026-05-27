import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import CompareControls from './CompareControls';
import type { Brand, Product } from '@/types/database';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare Products',
  // Comparison pages are per-visitor selections, not indexable content.
  robots: { index: false, follow: false },
};

const MAX_SLUGS = 4;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ slugs?: string }>;
}) {
  const { slugs: raw = '' } = await searchParams;
  const slugs = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SLUGS);

  const supabase = await createClient();

  // Fetch products + brand names in one shot. Brands resolved separately so
  // we don't depend on a relation declaration in `Database` (kept empty
  // throughout this project — see `types/database.ts`).
  const { data: products } = slugs.length
    ? await supabase.from('products').select('*').eq('is_active', true).in('slug', slugs)
    : { data: [] as Product[] };

  const ordered = orderBySlugs(slugs, products ?? []);
  const brandIds = Array.from(new Set(ordered.map((p) => p.brand_id).filter(Boolean))) as string[];
  const { data: brandRows } = brandIds.length
    ? await supabase.from('brands').select('id, name, slug').in('id', brandIds)
    : { data: [] as Pick<Brand, 'id' | 'name' | 'slug'>[] };
  const brandById = new Map((brandRows ?? []).map((b) => [b.id, b]));

  return (
    <div className="container py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Compare Products</h1>
          <p className="mt-1 text-sm text-gray-600">
            Side-by-side specs for the products you've selected.
          </p>
        </div>
        <Link
          href="/products"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          ← Add more products
        </Link>
      </header>

      {ordered.length === 0 ? <EmptyState /> : (
        <>
          <CompareControls />
          <ComparisonTable
            products={ordered}
            brandById={brandById}
          />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
      <p className="text-lg font-semibold text-gray-900">No products selected yet</p>
      <p className="mt-1 text-sm text-gray-600">
        Browse the catalogue and tap the <span className="font-medium">Compare</span> button on
        any product page to add it here.
      </p>
      <Link
        href="/products"
        className="mt-6 inline-block rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700"
      >
        Browse products
      </Link>
    </div>
  );
}

/**
 * The actual side-by-side table.
 *
 * Layout: one column per product (max 4). First column on the left is the
 * row label ("Price", "Brand", spec keys…). Every cell is the same width so
 * the columns line up.
 *
 * Mobile: the table scrolls horizontally inside `overflow-x-auto` — narrow
 * viewports get a one-column-at-a-time scroll instead of impossible
 * truncation.
 */
function ComparisonTable({
  products,
  brandById,
}: {
  products: Product[];
  brandById: Map<string, { id: string; name: string; slug: string }>;
}) {
  // Union of every spec key across selected products, preserving the order in
  // which they first appear (first product's keys, then any new ones from
  // subsequent products). Stable + predictable.
  const specKeyOrder: string[] = [];
  const seenKey = new Set<string>();
  for (const p of products) {
    const specs = (p.specifications ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(specs)) {
      if (seenKey.has(k)) continue;
      seenKey.add(k);
      specKeyOrder.push(k);
    }
  }

  const colWidth = `minmax(11rem, 1fr)`;
  const gridCols = `12rem repeat(${products.length}, ${colWidth})`;

  return (
    <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-gray-200">
      <div role="table" className="min-w-fit text-sm">
        {/* Header row: images + names */}
        <div
          role="row"
          className="sticky top-0 z-10 grid gap-0 border-b border-gray-200 bg-white"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div role="rowheader" className="p-4 font-semibold text-gray-700">
            Product
          </div>
          {products.map((p) => (
            <ProductHeaderCell key={p.id} product={p} />
          ))}
        </div>

        {/* Core attributes */}
        <Row gridCols={gridCols} label="Price">
          {products.map((p) => {
            const discount = calculateDiscount(p.price, p.compare_at_price);
            return (
              <div key={p.id} role="cell" className="border-l border-gray-100 px-4 py-3 align-top">
                <div className="font-semibold text-gray-900 tabular-nums">
                  {formatPrice(p.price)}
                </div>
                {p.compare_at_price && p.compare_at_price > p.price && (
                  <div className="text-xs text-gray-500 tabular-nums">
                    <span className="line-through">{formatPrice(p.compare_at_price)}</span>
                    {discount > 0 && (
                      <span className="ml-1 font-semibold text-primary-600">−{discount}%</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Row>

        <Row gridCols={gridCols} label="Brand">
          {products.map((p) => {
            const brand = p.brand_id ? brandById.get(p.brand_id) : null;
            return (
              <div key={p.id} role="cell" className="border-l border-gray-100 px-4 py-3 align-top">
                {brand ? (
                  <Link
                    href={`/brands/${brand.slug}`}
                    translate="no"
                    className="text-primary-600 hover:underline"
                  >
                    {brand.name}
                  </Link>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </div>
            );
          })}
        </Row>

        <Row gridCols={gridCols} label="SKU">
          {products.map((p) => (
            <div
              key={p.id}
              role="cell"
              className="border-l border-gray-100 px-4 py-3 align-top font-mono text-xs text-gray-700"
            >
              {p.sku ?? <span className="text-gray-400">—</span>}
            </div>
          ))}
        </Row>

        <Row gridCols={gridCols} label="Stock">
          {products.map((p) => {
            const isOutOfStock = p.track_inventory && p.stock_quantity === 0;
            const isLowStock =
              p.track_inventory && p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold;
            return (
              <div key={p.id} role="cell" className="border-l border-gray-100 px-4 py-3 align-top">
                {isOutOfStock ? (
                  <span className="font-semibold text-red-600">Out of stock</span>
                ) : isLowStock ? (
                  <span className="font-semibold text-orange-600">
                    Low — {p.stock_quantity} left
                  </span>
                ) : (
                  <span className="text-green-700">In stock</span>
                )}
              </div>
            );
          })}
        </Row>

        {/* Specifications group */}
        {specKeyOrder.length > 0 && (
          <>
            <div
              role="row"
              className="grid bg-gray-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-gray-500"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="col-span-full">Specifications</div>
            </div>
            {specKeyOrder.map((key) => (
              <Row key={key} gridCols={gridCols} label={key.replace(/_/g, ' ')}>
                {products.map((p) => {
                  const specs = (p.specifications ?? {}) as Record<string, unknown>;
                  const v = specs[key];
                  return (
                    <div
                      key={p.id}
                      role="cell"
                      className="border-l border-gray-100 px-4 py-3 align-top"
                    >
                      {v == null || v === '' ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <span>
                          {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </Row>
            ))}
          </>
        )}

        {/* Footer row: CTA per column */}
        <div
          role="row"
          className="grid gap-0 border-t border-gray-200"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div role="rowheader" className="px-4 py-4 font-semibold text-gray-700">
            View
          </div>
          {products.map((p) => {
            const inquiry = encodeURIComponent(
              `Hi War on Retail, I'd like to inquire about "${p.name}" (SKU ${p.sku ?? 'n/a'}).`,
            );
            return (
              <div
                key={p.id}
                role="cell"
                className="space-y-2 border-l border-gray-100 px-4 py-4 align-top"
              >
                <Link
                  href={`/products/${p.slug}`}
                  className="block rounded-md bg-primary-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-primary-700"
                >
                  See product
                </Link>
                <a
                  href={`https://wa.me/${siteConfig.whatsapp}?text=${inquiry}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-md bg-green-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-green-700"
                >
                  WhatsApp
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({
  gridCols,
  label,
  children,
}: {
  gridCols: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="row"
      className="grid border-t border-gray-100"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div
        role="rowheader"
        className="bg-gray-50 px-4 py-3 align-top text-sm font-medium capitalize text-gray-700"
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ProductHeaderCell({ product }: { product: Product }) {
  return (
    <div role="columnheader" className="border-l border-gray-100 p-4">
      <Link href={`/products/${product.slug}`} className="group block space-y-2">
        <div className="relative aspect-square overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200">
          {product.featured_image_url ? (
            <Image
              src={product.featured_image_url}
              alt={product.name}
              fill
              sizes="200px"
              className="object-cover"
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-3xl text-gray-300"
              aria-hidden="true"
            >
              📦
            </div>
          )}
        </div>
        <h2 className="line-clamp-2 font-semibold text-gray-900 group-hover:text-primary-600">
          {product.name}
        </h2>
      </Link>
    </div>
  );
}

/** Reorder fetched rows to match the URL slug order (Supabase `.in()` returns
 *  in arbitrary index order). */
function orderBySlugs(slugs: string[], rows: Product[]): Product[] {
  const bySlug = new Map(rows.map((r) => [r.slug, r]));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is Product => !!r);
}
