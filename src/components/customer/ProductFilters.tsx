'use client';

import { useEffect, useId, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdjustmentsHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import {
  filtersToQuery,
  hasActiveFilters,
  PARAM,
  readFilters,
  SORT_OPTIONS,
  type ProductFilters,
  type SortKey,
} from '@/lib/products/filters';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import type { Brand, Category } from '@/types/database';
import PriceRangeSlider from './PriceRangeSlider';

type Props = {
  categories: Pick<Category, 'id' | 'slug' | 'name' | 'parent_id'>[];
  brands: Pick<Brand, 'id' | 'slug' | 'name'>[];
  priceBounds: { min: number; max: number };
};

export default function ProductFilters({ categories, brands, priceBounds }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

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

  useBodyScrollLock(mobileOpen);

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

  const filterFields = (
    <>
      <div className="hidden lg:block">
        <SortSelect value={draft.sort} onChange={(v) => commit({ ...draft, sort: v })} />
      </div>

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

      <Group title="Brand">
        <ul className="max-h-56 space-y-2 overflow-y-auto overscroll-contain pr-1">
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

      <Group title="Price (GYD)">
        <PriceRangeSlider
          bounds={priceBounds}
          value={{ min: draft.minPrice, max: draft.maxPrice }}
          onCommit={setPriceRange}
        />
      </Group>

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

      {pending && (
        <p className="text-xs text-gray-500" aria-live="polite">
          Updating results…
        </p>
      )}
    </>
  );

  const filterHeader = hasActiveFilters(draft) ? (
    <button
      type="button"
      onClick={clearAll}
      className="min-h-11 px-2 text-xs font-medium text-primary-600 hover:underline"
    >
      Clear all
    </button>
  ) : null;

  return (
    <>
      {/* Mobile toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="product-filters"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-gray-50"
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
        <div className="min-w-0 flex-1">
          <SortSelect value={draft.sort} onChange={(v) => commit({ ...draft, sort: v })} />
        </div>
      </div>

      {/* Desktop sidebar */}
      <aside
        id="product-filters"
        aria-label="Product filters"
        className="hidden lg:sticky lg:top-32 lg:block lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
      >
        <div className="space-y-6 rounded-lg bg-white p-5 ring-1 ring-gray-200">
          <header className="flex items-center justify-between">
            <h2 className="text-base font-bold">Filters</h2>
            {filterHeader}
          </header>
          {filterFields}
        </div>
      </aside>

      {/* Mobile bottom sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close filters"
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Product filters"
            className="absolute inset-x-0 bottom-0 flex max-h-[min(85dvh,calc(100dvh-env(safe-area-inset-top)))] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
              <h2 className="text-base font-bold">Filters</h2>
              <div className="flex items-center gap-1">
                {filterHeader}
                <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close filters"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-gray-100"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {filterFields}
            </div>
            <div className="shrink-0 border-t border-gray-200 p-4">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex min-h-11 w-full items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Show results
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Collapsible filter section. Defaults to open so first-time users can see
 * what's filterable; the rotating chevron + `aria-expanded` on the button
 * give it solid keyboard/AT semantics. Body animation uses the
 * grid-template-rows 0fr→1fr trick (the same one in `Header.MobileSection`)
 * so we don't need to measure children to animate auto-height.
 *
 * `<fieldset>` + `<legend>` semantics are preserved — the legend hosts the
 * toggle button so screen readers still announce the group name when the
 * checkboxes are tabbed into.
 */
function Group({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const uid = useId();
  const bodyId = `${uid}-body`;
  return (
    <fieldset>
      <legend className="w-full">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex w-full items-center justify-between rounded-md py-1 text-left text-sm font-semibold text-gray-900 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <span>{title}</span>
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-yellow-300 transition-transform duration-200 motion-reduce:transition-none ${
              open ? 'rotate-180' : ''
            }`}
          >
            <ChevronDownIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      </legend>
      <div
        id={bodyId}
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-2">{children}</div>
        </div>
      </div>
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
      className={`flex min-h-11 cursor-pointer items-center gap-3 ${
        size === 'sm' ? 'text-xs text-gray-700' : 'text-sm text-gray-800'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span className="min-w-0 flex-1">{label}</span>
    </label>
  );
}

function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <label className="block w-full min-w-0 text-sm">
      <span className="sr-only">Sort by</span>
      <select
        name={PARAM.sort}
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="min-h-11 w-full max-w-full rounded-md border-gray-300 bg-white text-base shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
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
