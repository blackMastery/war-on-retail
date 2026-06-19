'use client';

import { useMemo, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

type Row = { id: string; key: string; value: string };

/**
 * Common spec keys offered as one-click quick-adds. Editing the row after
 * the fact is fine — these are seeds, not constraints.
 */
const QUICK_ADD_KEYS = [
  'Color',
  'Material',
  'Weight',
  'Dimensions',
  'Capacity',
  'Power',
  'Warranty',
  'Model',
  'Country of Origin',
  'Energy Rating',
] as const;

type Props = {
  /** Existing specifications from the DB, or null/undefined for a new product. */
  initial?: Record<string, unknown> | null;
};

/**
 * Friendlier replacement for the old raw-JSON textarea. The admin works
 * with one row per spec — key on the left, value on the right, X to remove,
 * arrows to reorder. State is local; a hidden `specifications_json` input
 * carries the serialised object to the existing `upsertProduct` server action
 * (no backend changes).
 *
 * Values stay as strings — keeps the model simple and matches how the public
 * product page renders them (via `String(v)`). The original schema does allow
 * booleans and numbers in the JSONB column for power users editing via SQL.
 */
export default function SpecificationsField({ initial }: Props) {
  const [rows, setRows] = useState<Row[]>(() => seedRows(initial));

  // Serialise rows → JSON object. Skip rows with empty keys so half-typed
  // entries don't pollute the saved data. Trim keys but preserve values
  // verbatim — sometimes a leading space is intentional in a value.
  const serialised = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const r of rows) {
      const k = r.key.trim();
      if (k === '') continue;
      obj[k] = r.value;
    }
    return JSON.stringify(obj);
  }, [rows]);

  const dupes = useMemo(() => findDuplicateKeys(rows), [rows]);

  function addRow(initialKey = '') {
    setRows((rs) => [...rs, { id: newId(), key: initialKey, value: '' }]);
  }
  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setRows((rs) => rs.filter((r) => r.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    setRows((rs) => {
      const i = rs.findIndex((r) => r.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= rs.length) return rs;
      const next = rs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="specifications_json" value={serialised} />

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted px-3 py-4 text-sm text-muted-foreground">
          No specs yet. Add the technical details that matter — they’ll appear in the{' '}
          <strong className="font-semibold text-secondary-foreground">Specifications</strong> table on the
          product page.
        </p>
      ) : (
        <ul role="list" className="space-y-2">
          {rows.map((row, idx) => {
            const isDupe = row.key.trim() !== '' && dupes.has(row.key.trim().toLowerCase());
            return (
              <li key={row.id} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  value={row.key}
                  onChange={(e) => updateRow(row.id, { key: e.target.value })}
                  placeholder="e.g. Screen size"
                  aria-label={`Specification ${idx + 1} name`}
                  className={`w-2/5 rounded-md text-sm shadow-sm focus:ring-ring ${
                    isDupe
                      ? 'border-orange-400 focus:border-orange-500 focus:ring-orange-500'
                      : 'border-border focus:border-ring'
                  }`}
                />
                <input
                  type="text"
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  placeholder="e.g. 55 inches"
                  aria-label={`Specification ${idx + 1} value`}
                  className="min-w-0 flex-1 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
                />
                <div className="flex shrink-0 items-center">
                  <IconButton
                    onClick={() => move(row.id, -1)}
                    disabled={idx === 0}
                    label="Move up"
                  >
                    <ArrowUpIcon className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    onClick={() => move(row.id, 1)}
                    disabled={idx === rows.length - 1}
                    label="Move down"
                  >
                    <ArrowDownIcon className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                  <IconButton onClick={() => removeRow(row.id)} label="Remove" danger>
                    <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {dupes.size > 0 && (
        <p
          role="alert"
          className="rounded-md bg-orange-50 px-3 py-2 text-xs text-orange-800 ring-1 ring-orange-200"
        >
          Duplicate spec name{dupes.size === 1 ? '' : 's'} highlighted in orange. Only the last
          value for each name is saved — rename or remove the duplicates.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => addRow()}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-muted"
        >
          + Add specification
        </button>
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          or quick-add:
        </span>
        {QUICK_ADD_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => addRow(k)}
            className="rounded-full bg-muted px-2.5 py-1 text-xs text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
          >
            + {k}
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------- helpers ----------

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function seedRows(initial: Record<string, unknown> | null | undefined): Row[] {
  if (!initial || typeof initial !== 'object') return [];
  return Object.entries(initial).map(([key, value]) => ({
    id: newId(),
    key,
    // Booleans → "yes"/"no" (more friendly than "true"/"false" for retail copy),
    // numbers → string, arrays/objects → JSON dump. Round-trippable enough.
    value:
      typeof value === 'boolean'
        ? value
          ? 'Yes'
          : 'No'
        : value == null
          ? ''
          : typeof value === 'object'
            ? JSON.stringify(value)
            : String(value),
  }));
}

function findDuplicateKeys(rows: Row[]): Set<string> {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const r of rows) {
    const k = r.key.trim().toLowerCase();
    if (k === '') continue;
    if (seen.has(k)) dupes.add(k);
    else seen.add(k);
  }
  return dupes;
}

function IconButton({
  onClick,
  children,
  label,
  disabled,
  danger,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-full p-1.5 ${
        danger
          ? 'text-muted-foreground hover:bg-red-50 hover:text-red-600'
          : 'text-muted-foreground hover:bg-muted hover:text-secondary-foreground'
      } disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground`}
    >
      {children}
    </button>
  );
}
