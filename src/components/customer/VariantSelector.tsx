'use client';

import type { ProductOption, ProductVariant } from '@/types/database';

type Props = {
  options: ProductOption[];
  /** Active variants only — inactive combinations render as unavailable. */
  variants: ProductVariant[];
  /** Currently selected value per option name. */
  selected: Record<string, string>;
  onSelect: (optionName: string, value: string) => void;
};

/**
 * One pill group per option. A value is disabled when no active variant
 * carries it at all; values that don't combine with the OTHER currently
 * selected options stay clickable — the parent snaps the rest of the
 * selection to a valid combination on click.
 */
export default function VariantSelector({ options, variants, selected, onSelect }: Props) {
  return (
    <div className="mt-6 space-y-4">
      {options.map((opt) => (
        <fieldset key={opt.name}>
          <legend className="text-sm font-medium text-secondary-foreground">
            {opt.name}
            {selected[opt.name] && (
              <span className="ml-2 font-normal text-muted-foreground">{selected[opt.name]}</span>
            )}
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {opt.values.map((value) => {
              const exists = variants.some((v) => v.option_values[opt.name] === value);
              const isSelected = selected[opt.name] === value;
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!exists}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(opt.name, value)}
                  className={`min-h-9 rounded-full border-2 px-4 py-1.5 text-sm font-medium transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : exists
                        ? 'border-border bg-card text-secondary-foreground hover:border-muted-foreground'
                        : 'cursor-not-allowed border-border bg-muted text-muted-foreground line-through opacity-60'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
