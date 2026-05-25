'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import {
  filtersToQuery,
  hasActiveFilters,
  PARAM,
  readFilters,
  SORT_OPTIONS,
  type ProductFilters,
  type SortKey,
} from '@/lib/products/filters';
import type { Brand, Category } from '@/types/database';
import PriceRangeSlider from './PriceRangeSlider';

type Props = {
  categories: Pick<Category, 'id' | 'slug' | 'name' | 'parent_id'>[];
  brands: Pick<Brand, 'id' | 'slug' | 'name'>[];
  /** Catalogue-wide price extremes — the slider's hard bounds. */
  priceBounds: { min: number; max: number };
};

export default function ProductFilters({ categories, brands, priceBounds }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Hydrate from URL on first paint AND whenever the URL changes externally
  // (e.g. a chip removal). Keeping the form state mirrored to the URL avoids
  // a confused "you cleared but I still show old" race.
  const urlFilters = useMemo(() => {
    const sp: Record<string, string | string[]> = {};
    for (const key of searchParams.keys()) {
      const all = searchParams.getAll(key);
      sp[key] = all.length > 1 ? all : all[0];
    }
    return readFilters(sp);
  }, [searchParams]);

  const [draft, setDraft] = useState<ProductFilters>(urlFilters);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => setDraft(urlFilters), [urlFilters]);

  // Top-level categories with their direct children grouped underneath.
  const tree = useMemo(() => {
    const tops = categories.filter((c) => !c.parent_id);
    return tops.map((t) => ({
      ...t,
      children: categories.filter((c) => c.parent_id === t.id),
    }));
  }, [categories]);

  function commit(next: ProductFilters) {
    setDraft(next);
    const qs = filtersToQuery(next);
    startTransition(() => {
      router.replace(qs ? `/products?${qs}` : '/products', { scroll: false });
    });
  }

  // ---- per-control handlers ----
  const toggleArr = (key: 'categorySlugs' | 'brandSlugs', slug: string) =>
    commit({
      ...draft,
      [key]: draft[key].includes(slug)
        ? draft[key].filter((s) => s !== slug)
        : [...draft[key], slug],
    });

  const setPriceRange = (next: { min: number | null; max: number | null }) =>
    commit({ ...draft, minPrice: next.min, maxPrice: next.max });

  const clearAll = () =>
    commit({
      categorySlugs: [],
      brandSlugs: [],
      minPrice: null,
      maxPrice: null,
      inStock: false,
      onSale: false,
      sort: 'featured',
    });

  return (
    <>
      {/* Mobile toggle */}
      <div className="mb-4 flex items-center justify-between lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-controls="product-filters"
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
        >
          <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden="true" />
          Filters
          {hasActiveFilters(draft) && (
            <span className="rounded-full bg-primary-600 px-1.5 text-xs font-bold text-white">
              {[
                ...draft.categorySlugs,
                ...draft.brandSlugs,
                draft.minPrice != null && 'p',
                draft.maxPrice != null && 'P',
                draft.inStock && 's',
                draft.onSale && 'd',
              ].filter(Boolean).length}
            </span>
          )}
        </button>
        <SortSelect value={draft.sort} onChange={(v) => commit({ ...draft, sort: v })} />
      </div>

      <aside
        id="product-filters"
        aria-label="Product filters"
        className={`${
          mobileOpen ? 'block' : 'hidden'
        } lg:sticky lg:top-32 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto`}
      >
        <div className="space-y-6 rounded-lg bg-white p-5 ring-1 ring-gray-200">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-bold">Filters</h2>
            {hasActiveFilters(draft) && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs font-medium text-primary-600 hover:underline"
              >
                Clear all
              </button>
            )}
          </header>

          {/* Sort — desktop only; mobile has its own next to the Filters button. */}
          <div className="hidden lg:block">
            <SortSelect value={draft.sort} onChange={(v) => commit({ ...draft, sort: v })} />
          </div>

          {/* Category */}
          <Group title="Category">
            <ul className="space-y-2">
              {tree.map((parent) => {
                const expanded =
                  draft.categorySlugs.includes(parent.slug) ||
                  parent.children.some((c) => draft.categorySlugs.includes(c.slug));
                return (
                  <li key={parent.id}>
                    <CheckboxRow
                      label={parent.name}
                      checked={draft.categorySlugs.includes(parent.slug)}
                      onChange={() => toggleArr('categorySlugs', parent.slug)}
                    />
                    {expanded && parent.children.length > 0 && (
                      <ul className="ml-5 mt-1 space-y-1">
                        {parent.children.map((c) => (
                          <li key={c.id}>
                            <CheckboxRow
                              label={c.name}
                              size="sm"
                              checked={draft.categorySlugs.includes(c.slug)}
                              onChange={() => toggleArr('categorySlugs', c.slug)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Group>

          {/* Brand */}
          <Group title="Brand">
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {brands.map((b) => (
                <li key={b.id}>
                  <CheckboxRow
                    label={b.name}
                    checked={draft.brandSlugs.includes(b.slug)}
                    onChange={() => toggleArr('brandSlugs', b.slug)}
                  />
                </li>
              ))}
            </ul>
          </Group>

          {/* Price */}
          <Group title="Price (GYD)">
            <PriceRangeSlider
              bounds={priceBounds}
              value={{ min: draft.minPrice, max: draft.maxPrice }}
              onCommit={setPriceRange}
            />
          </Group>

          {/* Availability + sale */}
          <Group title="Availability">
            <ul className="space-y-2">
              <li>
                <CheckboxRow
                  label="In stock only"
                  checked={draft.inStock}
                  onChange={() => commit({ ...draft, inStock: !draft.inStock })}
                />
              </li>
              <li>
                <CheckboxRow
                  label="On sale"
                  checked={draft.onSale}
                  onChange={() => commit({ ...draft, onSale: !draft.onSale })}
                />
              </li>
            </ul>
          </Group>

          {/* Mobile close */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex w-full items-center justify-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
            >
              <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              Close filters
            </button>
          </div>

          {pending && (
            <p className="text-xs text-gray-500" aria-live="polite">
              Updating results…
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-gray-900">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
  size = 'md',
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  size?: 'sm' | 'md';
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 ${
        size === 'sm' ? 'text-xs text-gray-700' : 'text-sm text-gray-800'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      {label}
    </label>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="block text-sm">
      <span className="sr-only">Sort by</span>
      <select
        name={PARAM.sort}
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="rounded-md border-gray-300 bg-white text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            Sort: {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
