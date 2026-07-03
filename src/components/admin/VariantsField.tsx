'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { ProductOption, ProductVariant } from '@/types/database';

/** Option axes offered as one-click seeds, same idea as SpecificationsField. */
const QUICK_ADD_OPTIONS = ['Size', 'Color', 'Material'] as const;

const MAX_OPTIONS = 3;

type OptionRow = { id: string; name: string; values: string };

/** Editable per-combination fields, keyed by the canonical combo key. */
type VariantRowData = {
  dbId?: string;
  sku: string;
  price: string;
  compareAtPrice: string;
  stockQuantity: string;
  imageUrl: string;
  isActive: boolean;
};

type Props = {
  /** Existing option axes from the DB ([] for a new/variantless product). */
  initialOptions?: ProductOption[];
  /** Existing variant rows from the DB. */
  initialVariants?: ProductVariant[];
  /** Live gallery URLs (featured + gallery) — the pool variant images pick from. */
  galleryUrls: string[];
  /** Base price used to prefill new combinations. */
  basePrice?: number | null;
  /** Fires with true while at least one combination exists (product is variant-managed). */
  onVariantManagedChange?: (managed: boolean) => void;
  /** Server-side error for the variants payload, if any. */
  error?: string;
};

/**
 * Options builder + auto-generated variant matrix. State is local; two hidden
 * inputs (`options_json`, `variants_json`) carry the payload to `upsertProduct`,
 * following the same hidden-JSON pattern as SpecificationsField/ProductImagesField.
 *
 * Every combination in the matrix is submitted; the Active checkbox maps to
 * `product_variants.is_active` (soft-hide from the storefront, stock/SKU kept).
 * Combinations that disappear because an option or value was removed are
 * deleted server-side — renaming an option or value therefore recreates the
 * affected variants from scratch.
 */
export default function VariantsField({
  initialOptions = [],
  initialVariants = [],
  galleryUrls,
  basePrice,
  onVariantManagedChange,
  error,
}: Props) {
  const [options, setOptions] = useState<OptionRow[]>(() =>
    initialOptions.map((o) => ({ id: newId(), name: o.name, values: o.values.join(', ') })),
  );
  const [rowData, setRowData] = useState<Record<string, VariantRowData>>(() => {
    const seeded: Record<string, VariantRowData> = {};
    for (const v of initialVariants) {
      seeded[comboKey(v.option_values)] = {
        dbId: v.id,
        sku: v.sku ?? '',
        price: String(v.price),
        compareAtPrice: v.compare_at_price != null ? String(v.compare_at_price) : '',
        stockQuantity: String(v.stock_quantity),
        imageUrl: v.image_url ?? '',
        isActive: v.is_active,
      };
    }
    return seeded;
  });

  // Parsed option axes: trimmed names, comma-split deduped values.
  const parsedOptions = useMemo<ProductOption[]>(
    () =>
      options
        .map((o) => ({
          name: o.name.trim(),
          values: dedupe(
            o.values
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean),
          ),
        }))
        .filter((o) => o.name !== '' && o.values.length > 0),
    [options],
  );

  /** Cartesian product of every option's values, in matrix order. */
  const combos = useMemo<Record<string, string>[]>(() => {
    if (parsedOptions.length === 0) return [];
    let acc: Record<string, string>[] = [{}];
    for (const opt of parsedOptions) {
      acc = acc.flatMap((partial) => opt.values.map((v) => ({ ...partial, [opt.name]: v })));
    }
    return acc;
  }, [parsedOptions]);

  const managed = combos.length > 0;
  useEffect(() => {
    onVariantManagedChange?.(managed);
  }, [managed, onVariantManagedChange]);

  // Row data is keyed by the option-value TEXT, so renaming an option or
  // fixing a typo in a value would orphan every matrix entry — the admin's
  // SKU/price/stock would visibly reset while typing, and saved variants
  // would lose their DB ids (= deleted + recreated with zeroed stock on
  // save). When only names change (same option count, same value count per
  // option), remap the keys positionally so edits survive renames.
  const prevParsedRef = useRef<ProductOption[]>(parsedOptions);
  useEffect(() => {
    const prev = prevParsedRef.current;
    const next = parsedOptions;
    prevParsedRef.current = next;
    if (prev === next || prev.length !== next.length) return;
    const sameShape = prev.every((o, i) => o.values.length === next[i].values.length);
    if (!sameShape) return;
    const changed = prev.some(
      (o, i) => o.name !== next[i].name || o.values.some((v, j) => v !== next[i].values[j]),
    );
    if (!changed) return;

    setRowData((prevData) => {
      const remapped: Record<string, VariantRowData> = {};
      for (const [key, data] of Object.entries(prevData)) {
        let combo: Record<string, string>;
        try {
          combo = JSON.parse(key);
        } catch {
          continue;
        }
        const nextCombo: Record<string, string> = {};
        let ok = true;
        for (let i = 0; i < prev.length; i++) {
          const value = combo[prev[i].name];
          const j = value === undefined ? -1 : prev[i].values.indexOf(value);
          if (j === -1) {
            ok = false;
            break;
          }
          nextCombo[next[i].name] = next[i].values[j];
        }
        remapped[ok ? comboKey(nextCombo) : key] = data;
      }
      return remapped;
    });
  }, [parsedOptions]);

  // The screenshot-classic mistake: one option per variant (each with a
  // single value) collapses the whole matrix into ONE combined variant.
  const looksLikeMisuse =
    parsedOptions.length > 1 && parsedOptions.every((o) => o.values.length === 1);

  const defaultRow = (): VariantRowData => ({
    sku: '',
    price: basePrice != null ? String(basePrice) : '',
    compareAtPrice: '',
    stockQuantity: '0',
    imageUrl: '',
    isActive: true,
  });

  const optionsJson = useMemo(() => JSON.stringify(parsedOptions), [parsedOptions]);
  const variantsJson = useMemo(
    () =>
      JSON.stringify(
        combos.map((combo, idx) => {
          const row = rowData[comboKey(combo)] ?? defaultRow();
          return {
            id: row.dbId,
            option_values: combo,
            sku: row.sku,
            price: row.price,
            compare_at_price: row.compareAtPrice,
            stock_quantity: row.stockQuantity,
            image_url: row.imageUrl,
            is_active: row.isActive,
            position: idx,
          };
        }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [combos, rowData, basePrice],
  );

  function updateRow(key: string, patch: Partial<VariantRowData>) {
    setRowData((prev) => ({ ...prev, [key]: { ...(prev[key] ?? defaultRow()), ...patch } }));
  }
  function addOption(name = '') {
    setOptions((os) => (os.length >= MAX_OPTIONS ? os : [...os, { id: newId(), name, values: '' }]));
  }
  function updateOption(id: string, patch: Partial<OptionRow>) {
    setOptions((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function removeOption(id: string) {
    setOptions((os) => os.filter((o) => o.id !== id));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="options_json" value={optionsJson} />
      <input type="hidden" name="variants_json" value={variantsJson} />

      {/* ---- Options builder ---- */}
      {options.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted px-3 py-4 text-sm text-muted-foreground">
          No options yet. Add ONE option (e.g.{' '}
          <strong className="font-semibold text-secondary-foreground">Size</strong>) and list all
          its choices comma-separated (e.g.{' '}
          <strong className="font-semibold text-secondary-foreground">Queen, Full, Twin</strong>)
          — you get one variant per choice, each with its own SKU, price and stock. Add a second
          option (e.g. Color) only when customers combine choices.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {options.map((opt, idx) => (
            <li key={opt.id} className="flex items-center gap-2">
              <input
                type="text"
                value={opt.name}
                onChange={(e) => updateOption(opt.id, { name: e.target.value })}
                placeholder="Option name, e.g. Size"
                aria-label={`Option ${idx + 1} name`}
                className="w-1/4 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
              />
              <input
                type="text"
                value={opt.values}
                onChange={(e) => updateOption(opt.id, { values: e.target.value })}
                placeholder="Values, comma-separated — e.g. S, M, L"
                aria-label={`Option ${idx + 1} values`}
                className="min-w-0 flex-1 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => removeOption(opt.id)}
                aria-label={`Remove option ${opt.name || idx + 1}`}
                title="Remove option"
                className="rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
              >
                <XMarkIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {looksLikeMisuse && (
        <p
          role="alert"
          className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-800 ring-1 ring-orange-200"
        >
          Each of these options has only one value, so they combine into a{' '}
          <strong className="font-semibold">single</strong> variant. If you want one variant per
          row (e.g. Queen / Full / Twin as separate sizes), use ONE option named{' '}
          <strong className="font-semibold">Size</strong> and put all the sizes in its values,
          comma-separated.
        </p>
      )}

      {options.length < MAX_OPTIONS && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => addOption()}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted"
          >
            + Add option
          </button>
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            or quick-add:
          </span>
          {QUICK_ADD_OPTIONS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addOption(name)}
              className="rounded-full bg-muted px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
            >
              + {name}
            </button>
          ))}
        </div>
      )}

      {/* ---- Variant matrix ---- */}
      {managed && (
        <fieldset>
          <legend className="text-xs font-medium text-muted-foreground">
            {combos.length} variant{combos.length === 1 ? '' : 's'} — every combination gets its
            own SKU, price and stock. Untick Active to stop selling a combination without losing
            its data. Removing an option or value deletes its variants on save.
          </legend>
          <div className="mt-2 overflow-x-auto rounded-md ring-1 ring-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Variant</th>
                  <th className="px-3 py-2 font-medium">Active</th>
                  <th className="px-3 py-2 font-medium">SKU</th>
                  <th className="px-3 py-2 font-medium">Price (GYD)</th>
                  <th className="px-3 py-2 font-medium">Compare-at</th>
                  <th className="px-3 py-2 font-medium">Stock</th>
                  <th className="px-3 py-2 font-medium">Image</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {combos.map((combo) => {
                  const key = comboKey(combo);
                  const row = rowData[key] ?? defaultRow();
                  const label = Object.values(combo).join(' / ');
                  return (
                    <tr key={key} className={row.isActive ? '' : 'opacity-60'}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-secondary-foreground">
                        {label}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(e) => updateRow(key, { isActive: e.target.checked })}
                          aria-label={`${label} active`}
                          className="rounded text-primary"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={row.sku}
                          onChange={(e) => updateRow(key, { sku: e.target.value })}
                          aria-label={`${label} SKU`}
                          className="w-32 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.price}
                          onChange={(e) => updateRow(key, { price: e.target.value })}
                          aria-label={`${label} price`}
                          className="w-28 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.compareAtPrice}
                          onChange={(e) => updateRow(key, { compareAtPrice: e.target.value })}
                          aria-label={`${label} compare-at price`}
                          className="w-28 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.stockQuantity}
                          onChange={(e) => updateRow(key, { stockQuantity: e.target.value })}
                          aria-label={`${label} stock`}
                          className="w-20 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          {row.imageUrl && (
                            <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded ring-1 ring-border">
                              <Image
                                src={row.imageUrl}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </span>
                          )}
                          <select
                            value={row.imageUrl}
                            onChange={(e) => updateRow(key, { imageUrl: e.target.value })}
                            aria-label={`${label} image`}
                            className="w-36 rounded-md border-border text-xs shadow-sm focus:border-ring focus:ring-ring"
                          >
                            <option value="">— No image —</option>
                            {galleryUrls.map((url, i) => (
                              <option key={url} value={url}>
                                Image {i + 1} · {fileLabel(url)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------- helpers ----------

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Canonical key for a combination — sorted keys so {a,b} === {b,a}. */
function comboKey(optionValues: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(optionValues).sort(([a], [b]) => a.localeCompare(b))),
  );
}

/** Case-insensitive dedupe, keeping the first spelling the admin typed. */
function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const k = v.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(v);
  }
  return out;
}

/** Last path segment, shortened — enough to tell gallery images apart. */
function fileLabel(url: string): string {
  const name = url.split('/').pop() ?? url;
  return name.length > 24 ? `…${name.slice(-24)}` : name;
}
