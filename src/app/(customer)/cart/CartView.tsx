'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  selectDiscountAmount,
  selectSubtotal,
  selectTotal,
  useCartHydrated,
  useCartStore,
} from '@/lib/cart/store';
import { buildInquiryUrl } from '@/lib/cart/whatsapp';
import { formatPrice } from '@/lib/utils';
import DiscountCodeInput from '@/components/customer/DiscountCodeInput';

/**
 * Renders the live cart. Client-only because the cart is in localStorage.
 *
 * Three states:
 *   - **Not hydrated** (first paint / SSR) → a skeleton so the layout doesn't
 *     jump when the items materialise from localStorage.
 *   - **Hydrated + empty** → friendly empty state with a back-to-shopping link.
 *   - **Hydrated + has items** → line-item list with qty steppers + subtotal +
 *     WhatsApp inquiry button.
 *
 * The parent server page (`cart/page.tsx`) reads the live store settings and
 * threads them in so the WhatsApp link, the brand name in the inquiry text,
 * and the "or call us" fallback all reflect admin edits.
 */
export default function CartView({
  storeInfo,
}: {
  storeInfo: { name: string; phone: string; whatsapp: string };
}) {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const discountAmount = useCartStore(selectDiscountAmount);
  const total = useCartStore(selectTotal);
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  if (!hydrated) {
    return (
      <div className="mt-6 animate-pulse space-y-3">
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-24 rounded-lg bg-muted" />
        <div className="h-12 w-48 rounded-md bg-muted" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="text-lg font-semibold text-foreground">Your cart is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add products from the catalogue and they'll appear here.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90"
        >
          Browse products
        </Link>
      </div>
    );
  }

  const inquiryUrl = buildInquiryUrl(items, storeInfo);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* Line items */}
      <ul role="list" className="divide-y divide-border rounded-lg bg-card ring-1 ring-border">
        {/* Removing a line slides it out and lets the rest settle up (layout).
            initial={false} so the existing cart doesn't animate in on mount. */}
        <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.li
            key={item.productId}
            layout
            exit={{ opacity: 0, x: -24, transition: { duration: 0.2, ease: 'easeOut' } }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex gap-4 p-4"
          >
            {/* Image duplicates the product-name link below; hide it from AT and
                the tab order so the line item exposes a single named link. */}
            <Link
              href={`/products/${item.slug}`}
              aria-hidden="true"
              tabIndex={-1}
              className="relative block aspect-square w-24 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border"
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <div
                  className="flex h-full items-center justify-center text-3xl text-muted-foreground"
                  aria-hidden="true"
                >
                  📦
                </div>
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/products/${item.slug}`}
                  className="line-clamp-2 font-semibold text-foreground hover:text-link-on-light"
                >
                  {item.name}
                </Link>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {item.sku && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">SKU: {item.sku}</p>
              )}
              {item.isPreOrder && (
                <span className="mt-1 inline-flex w-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                  Pre-order
                </span>
              )}

              <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => setQuantity(item.productId, q)}
                  label={`Quantity of ${item.name}`}
                />
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-foreground">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  {item.quantity > 1 && (
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatPrice(item.price)} each
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.li>
        ))}
        </AnimatePresence>
      </ul>

      {/* Sticky summary */}
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
          <h2 className="text-lg font-bold">Inquiry summary</h2>

          <dl className="space-y-2 text-sm" aria-live="polite" aria-atomic="true">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Items <span className="tabular-nums">({totalItems})</span>
              </dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between text-green-700">
                <dt>
                  Discount{' '}
                  <span className="font-mono text-xs uppercase">({appliedDiscount.code})</span>
                </dt>
                <dd className="tabular-nums">−{formatPrice(discountAmount)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-3">
              <dt className="font-semibold text-foreground">
                {appliedDiscount ? 'Total' : 'Subtotal'}
              </dt>
              <dd className="text-lg font-bold tabular-nums text-foreground">
                {formatPrice(total)}
              </dd>
            </div>
          </dl>

          <DiscountCodeInput />

          <p className="text-xs text-muted-foreground">
            Pick delivery or pickup, choose how you'd like to pay, and we'll confirm
            availability before anything is charged.
          </p>

          <Link
            href="/checkout"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-6 py-3 font-semibold hover:opacity-90"
          >
            Continue to checkout
            <span aria-hidden="true">→</span>
          </Link>

          <a
            href={inquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-green-600 px-6 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            <span aria-hidden="true">💬 </span>Prefer to chat? Inquire via WhatsApp
          </a>

          <div className="flex flex-col gap-2 text-xs">
            <Link
              href="/products"
              className="text-center font-medium text-link hover:underline"
            >
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm('Empty your cart? This cannot be undone.')) clear();
              }}
              className="text-center text-muted-foreground hover:text-red-600 hover:underline"
            >
              Clear cart
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Or call us:{' '}
            <a href={`tel:${storeInfo.phone}`} className="font-medium hover:text-secondary-foreground">
              {storeInfo.phone}
            </a>
          </p>
        </div>
      </aside>
    </div>
  );
}

function QuantityStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  return (
    <div
      className="inline-flex items-center rounded-md ring-1 ring-border"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center rounded-l-md text-muted-foreground hover:bg-muted disabled:opacity-30"
        disabled={value <= 1}
      >
        <MinusIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          if (Number.isFinite(n) && n >= 1) onChange(n);
        }}
        aria-label={label}
        className="h-9 w-12 border-0 bg-transparent text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted"
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
