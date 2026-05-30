'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  selectSubtotal,
  useCartHydrated,
  useCartStore,
} from '@/lib/cart/store';
import { buildInquiryUrl } from '@/lib/cart/whatsapp';
import { formatPrice } from '@/lib/utils';
import { siteConfig } from '@/config/site';

/**
 * Renders the live cart. Client-only because the cart is in localStorage.
 *
 * Three states:
 *   - **Not hydrated** (first paint / SSR) → a skeleton so the layout doesn't
 *     jump when the items materialise from localStorage.
 *   - **Hydrated + empty** → friendly empty state with a back-to-shopping link.
 *   - **Hydrated + has items** → line-item list with qty steppers + subtotal +
 *     WhatsApp inquiry button.
 */
export default function CartView() {
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clear = useCartStore((s) => s.clear);

  if (!hydrated) {
    return (
      <div className="mt-6 animate-pulse space-y-3">
        <div className="h-24 rounded-lg bg-gray-100" />
        <div className="h-24 rounded-lg bg-gray-100" />
        <div className="h-12 w-48 rounded-md bg-gray-100" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-lg font-semibold text-gray-900">Your cart is empty</p>
        <p className="mt-1 text-sm text-gray-600">
          Add products from the catalogue and they'll appear here.
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

  const inquiryUrl = buildInquiryUrl(items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {/* Line items */}
      <ul role="list" className="divide-y divide-gray-200 rounded-lg bg-white ring-1 ring-gray-200">
        {items.map((item) => (
          <li key={item.productId} className="flex gap-4 p-4">
            <Link
              href={`/products/${item.slug}`}
              className="relative block aspect-square w-24 shrink-0 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200"
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
                  className="flex h-full items-center justify-center text-3xl text-gray-300"
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
                  className="line-clamp-2 font-semibold text-gray-900 hover:text-primary-600"
                >
                  {item.name}
                </Link>
                <button
                  type="button"
                  onClick={() => removeItem(item.productId)}
                  aria-label={`Remove ${item.name} from cart`}
                  className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                >
                  <TrashIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {item.sku && (
                <p className="mt-0.5 font-mono text-xs text-gray-500">SKU: {item.sku}</p>
              )}

              <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
                <QuantityStepper
                  value={item.quantity}
                  onChange={(q) => setQuantity(item.productId, q)}
                  label={`Quantity of ${item.name}`}
                />
                <div className="text-right">
                  <div className="font-semibold tabular-nums text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </div>
                  {item.quantity > 1 && (
                    <div className="text-xs text-gray-500 tabular-nums">
                      {formatPrice(item.price)} each
                    </div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Sticky summary */}
      <aside className="lg:sticky lg:top-32 lg:self-start">
        <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="text-lg font-bold">Inquiry summary</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">
                Items <span className="tabular-nums">({totalItems})</span>
              </dt>
              <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-3">
              <dt className="font-semibold text-gray-900">Subtotal</dt>
              <dd className="text-lg font-bold tabular-nums text-gray-900">
                {formatPrice(subtotal)}
              </dd>
            </div>
          </dl>

          <p className="text-xs text-gray-500">
            Delivery and final pricing are confirmed by our team on WhatsApp. We'll respond with
            availability and arrange delivery to your area.
          </p>

          <a
            href={inquiryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
          >
            <span aria-hidden="true">💬 </span>Send inquiry via WhatsApp
          </a>

          <div className="flex flex-col gap-2 text-xs">
            <Link
              href="/products"
              className="text-center font-medium text-primary-600 hover:underline"
            >
              ← Continue shopping
            </Link>
            <button
              type="button"
              onClick={() => {
                if (confirm('Empty your cart? This cannot be undone.')) clear();
              }}
              className="text-center text-gray-500 hover:text-red-600 hover:underline"
            >
              Clear cart
            </button>
          </div>

          <p className="text-center text-xs text-gray-400">
            Or call us:{' '}
            <a href={`tel:${siteConfig.phone}`} className="font-medium hover:text-gray-700">
              {siteConfig.phone}
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
      className="inline-flex items-center rounded-md ring-1 ring-gray-300"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label="Decrease quantity"
        className="flex h-9 w-9 items-center justify-center rounded-l-md text-gray-600 hover:bg-gray-50 disabled:opacity-30"
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
        aria-label="Quantity"
        className="h-9 w-12 border-0 bg-transparent text-center text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        className="flex h-9 w-9 items-center justify-center rounded-r-md text-gray-600 hover:bg-gray-50"
      >
        <PlusIcon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
