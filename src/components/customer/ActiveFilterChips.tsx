import Link from 'next/link';
import { filtersToQuery, type ProductFilters } from '@/lib/products/filters';
import { formatPrice } from '@/lib/utils';
import type { Brand, Category } from '@/types/database';

type Props = {
  filters: ProductFilters;
  categories: Pick<Category, 'slug' | 'name'>[];
  brands: Pick<Brand, 'slug' | 'name'>[];
};

/**
 * Renders the currently-active filters as removable chips. Each chip links to
 * the same page minus that one filter — clean URL semantics, works without JS,
 * and the parent client `<ProductFilters>` will re-hydrate from the new URL.
 */
export default function ActiveFilterChips({ filters, categories, brands }: Props) {
  const catName = new Map(categories.map((c) => [c.slug, c.name]));
  const brandName = new Map(brands.map((b) => [b.slug, b.name]));

  const chips: { key: string; label: string; without: ProductFilters }[] = [];

  for (const slug of filters.categorySlugs) {
    chips.push({
      key: `c:${slug}`,
      label: catName.get(slug) ?? slug,
      without: { ...filters, categorySlugs: filters.categorySlugs.filter((s) => s !== slug) },
    });
  }
  for (const slug of filters.brandSlugs) {
    chips.push({
      key: `b:${slug}`,
      label: brandName.get(slug) ?? slug,
      without: { ...filters, brandSlugs: filters.brandSlugs.filter((s) => s !== slug) },
    });
  }
  if (filters.minPrice != null) {
    chips.push({
      key: 'min',
      label: `Min ${formatPrice(filters.minPrice)}`,
      without: { ...filters, minPrice: null },
    });
  }
  if (filters.maxPrice != null) {
    chips.push({
      key: 'max',
      label: `Max ${formatPrice(filters.maxPrice)}`,
      without: { ...filters, maxPrice: null },
    });
  }
  if (filters.inStock) {
    chips.push({ key: 'stock', label: 'In stock', without: { ...filters, inStock: false } });
  }
  if (filters.onSale) {
    chips.push({ key: 'sale', label: 'On sale', without: { ...filters, onSale: false } });
  }

  if (!chips.length) return null;

  return (
    <ul className="mb-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => {
        const qs = filtersToQuery(chip.without);
        return (
          <li key={chip.key}>
            <Link
              href={qs ? `/products?${qs}` : '/products'}
              scroll={false}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 ring-1 ring-primary-200 hover:bg-primary-100"
              aria-label={`Remove filter: ${chip.label}`}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </Link>
          </li>
        );
      })}
      <li>
        <Link
          href="/products"
          scroll={false}
          className="text-xs font-medium text-gray-600 hover:text-primary-700 hover:underline"
        >
          Clear all
        </Link>
      </li>
    </ul>
  );
}
