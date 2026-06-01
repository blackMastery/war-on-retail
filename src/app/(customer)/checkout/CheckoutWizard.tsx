'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { selectSubtotal, useCartHydrated, useCartStore } from '@/lib/cart/store';
import { formatPrice } from '@/lib/utils';
import type { CartItem } from '@/lib/cart/types';
import { placeOrderAction } from './actions';

type Method = {
  id: string;
  name: string;
  description: string | null;
};

type StoreInfo = {
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  hours: { weekdays: string; saturday: string; sunday: string };
  mapsEmbedUrl: string;
};

type WizardDraft = {
  customer: { name: string; phone: string };
  fulfillment:
    | { type: 'delivery'; city: string; address: string }
    | { type: 'pickup' }
    | { type: '' };
  paymentMethodId: string;
};

const STEPS = ['Customer', 'Checkout', 'Payment'] as const;
type StepIdx = 0 | 1 | 2;

/**
 * Three-step checkout wizard.
 *
 * Why React state and not URL routing: cart state already lives in
 * `localStorage` via Zustand, and step progression is validation-gated, not
 * navigation-gated. URL `?step=` would let users skip ahead by typing.
 *
 * Why nested per-step Zod schemas inline (not a single combined one): each
 * "Next" click should highlight only the field(s) on the current step. The
 * server action revalidates the combined shape — Zod is the source of truth
 * there too.
 */
export default function CheckoutWizard({
  methods,
  storeInfo,
}: {
  methods: Method[];
  storeInfo: StoreInfo;
}) {
  const router = useRouter();
  const hydrated = useCartHydrated();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectSubtotal);

  const [step, setStep] = useState<StepIdx>(0);
  const [draft, setDraft] = useState<WizardDraft>({
    customer: { name: '', phone: '' },
    fulfillment: { type: '' },
    paymentMethodId: '',
  });
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Redirect to /cart once we know the cart is empty.
  useEffect(() => {
    if (hydrated && items.length === 0 && !submitting) {
      router.replace('/cart');
    }
  }, [hydrated, items.length, submitting, router]);

  // Pre-hydration shimmer — keeps the layout stable.
  if (!hydrated) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 rounded-md bg-gray-100" />
        <div className="h-48 rounded-md bg-gray-100" />
      </div>
    );
  }

  if (items.length === 0) return null;

  function goTo(next: StepIdx) {
    setStepError(null);
    setStep(next);
  }

  function validateStep1(): string | null {
    if (draft.customer.name.trim().length < 2) return 'Please enter your full name.';
    const phone = draft.customer.phone.trim();
    if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
      return 'Please enter a valid phone number (digits, spaces, + and ( ) allowed).';
    }
    return null;
  }
  function validateStep2(): string | null {
    if (draft.fulfillment.type === '') return 'Please choose delivery or pickup.';
    if (draft.fulfillment.type === 'delivery') {
      if (draft.fulfillment.city.trim().length < 2) return 'Please enter your city / town.';
      if (draft.fulfillment.address.trim().length < 6) {
        return 'Please enter a delivery address with at least 6 characters.';
      }
    }
    return null;
  }
  function validateStep3(): string | null {
    if (!draft.paymentMethodId) return 'Please choose a payment method.';
    if (!methods.some((m) => m.id === draft.paymentMethodId)) {
      return 'That payment method is no longer available — please pick another.';
    }
    return null;
  }

  function handleNext() {
    const err =
      step === 0 ? validateStep1() : step === 1 ? validateStep2() : validateStep3();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    if (step < 2) setStep((step + 1) as StepIdx);
  }

  async function handleSubmit() {
    const err = validateStep1() ?? validateStep2() ?? validateStep3();
    if (err) {
      setStepError(err);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      // The action handles redirect on success; on failure it returns an error.
      const result = await placeOrderAction({
        customer: draft.customer,
        fulfillment: draft.fulfillment as WizardDraft['fulfillment'] & { type: 'delivery' | 'pickup' },
        paymentMethodId: draft.paymentMethodId,
        items: items.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
      });
      if (result?.error) {
        setSubmitError(result.error);
        setSubmitting(false);
      } else if (result?.orderNumber) {
        // Clear cart THEN navigate so the success page never flashes a redirect-loop.
        useCartStore.getState().clear();
        router.push(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}`);
      }
    } catch (e) {
      setSubmitError(
        e instanceof Error ? e.message : 'Something went wrong. Please try again.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div>
        <StepBar step={step} onStepClick={(s) => goTo(s)} />

        <div className="mt-6 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6">
          {step === 0 && (
            <StepCustomer
              value={draft.customer}
              onChange={(c) => setDraft((d) => ({ ...d, customer: c }))}
            />
          )}
          {step === 1 && (
            <StepFulfillment
              value={draft.fulfillment}
              onChange={(f) => setDraft((d) => ({ ...d, fulfillment: f }))}
              storeInfo={storeInfo}
            />
          )}
          {step === 2 && (
            <StepPayment
              methods={methods}
              value={draft.paymentMethodId}
              onChange={(id) => setDraft((d) => ({ ...d, paymentMethodId: id }))}
            />
          )}

          {(stepError || submitError) && (
            <div
              role="alert"
              aria-live="polite"
              className="mt-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{submitError ?? stepError}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo((step - 1) as StepIdx)}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            ) : (
              <Link
                href="/cart"
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                Back to cart
              </Link>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-md bg-primary-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-primary-700"
              >
                Continue
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
              >
                {submitting ? 'Placing order…' : 'Place order'}
              </button>
            )}
          </div>
        </div>
      </div>

      <OrderSummary items={items} subtotal={subtotal} />
    </div>
  );
}

// ---------- Step bar ----------

function StepBar({
  step,
  onStepClick,
}: {
  step: StepIdx;
  onStepClick: (s: StepIdx) => void;
}) {
  return (
    <ol
      aria-label="Checkout progress"
      className="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-stretch sm:gap-0"
    >
      {STEPS.map((label, i) => {
        const isCurrent = i === step;
        const isDone = i < step;
        const reachable = i <= step;
        return (
          <li
            key={label}
            className="flex-1"
            aria-current={isCurrent ? 'step' : undefined}
          >
            <button
              type="button"
              onClick={() => reachable && onStepClick(i as StepIdx)}
              disabled={!reachable}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition ${
                isCurrent
                  ? 'bg-primary-50'
                  : reachable
                    ? 'hover:bg-gray-50'
                    : 'cursor-not-allowed opacity-60'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-primary-600 text-white'
                    : isCurrent
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                }`}
                aria-hidden="true"
              >
                {isDone ? <CheckCircleIcon className="h-5 w-5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs uppercase tracking-wide text-gray-500">
                  Step {i + 1}
                </span>
                <span className="block text-sm font-semibold text-gray-900">
                  {label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

// ---------- Step 1: Customer ----------

function StepCustomer({
  value,
  onChange,
}: {
  value: { name: string; phone: string };
  onChange: (v: { name: string; phone: string }) => void;
}) {
  const uid = useId();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Tell us who you are</h2>
        <p className="mt-1 text-sm text-gray-600">
          We use this to confirm the order and arrange delivery or pickup. No
          account needed.
        </p>
      </div>
      <div>
        <label htmlFor={`${uid}-name`} className="block text-sm font-medium text-gray-700">
          Full name
        </label>
        <input
          id={`${uid}-name`}
          type="text"
          required
          autoComplete="name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Jane Doe"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-phone`} className="block text-sm font-medium text-gray-700">
          Phone number
        </label>
        <input
          id={`${uid}-phone`}
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="+592 600 0000"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          We'll call or WhatsApp this number to confirm.
        </p>
      </div>
    </div>
  );
}

// ---------- Step 2: Fulfillment ----------

function StepFulfillment({
  value,
  onChange,
  storeInfo,
}: {
  value: WizardDraft['fulfillment'];
  onChange: (v: WizardDraft['fulfillment']) => void;
  storeInfo: StoreInfo;
}) {
  const uid = useId();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">How would you like to receive it?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Delivery to your door, or pick it up in person — your choice.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <RadioCard
          name={`${uid}-fulfillment`}
          id={`${uid}-delivery`}
          checked={value.type === 'delivery'}
          onChange={() =>
            onChange({
              type: 'delivery',
              city:
                value.type === 'delivery' ? value.city : '',
              address:
                value.type === 'delivery' ? value.address : '',
            })
          }
          title="Delivery"
          subtitle="We bring it to you"
          icon="🚚"
        />
        <RadioCard
          name={`${uid}-fulfillment`}
          id={`${uid}-pickup`}
          checked={value.type === 'pickup'}
          onChange={() => onChange({ type: 'pickup' })}
          title="Pickup"
          subtitle="Collect from our store"
          icon="🏬"
        />
      </div>

      {value.type === 'delivery' && (
        <div className="space-y-3 rounded-md bg-gray-50 p-4 ring-1 ring-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Same-day in Georgetown.</span>{' '}
            2–5 days nationwide. We confirm a delivery window when we call.
          </p>
          <div>
            <label htmlFor={`${uid}-city`} className="block text-sm font-medium text-gray-700">
              City / town
            </label>
            <input
              id={`${uid}-city`}
              type="text"
              required
              autoComplete="address-level2"
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="Georgetown"
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-address`} className="block text-sm font-medium text-gray-700">
              Street address
            </label>
            <textarea
              id={`${uid}-address`}
              required
              autoComplete="street-address"
              rows={3}
              value={value.address}
              onChange={(e) => onChange({ ...value, address: e.target.value })}
              placeholder="House number, street, ward, landmarks…"
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>
      )}

      {value.type === 'pickup' && (
        <PickupCard storeInfo={storeInfo} />
      )}
    </div>
  );
}

function PickupCard({ storeInfo }: { storeInfo: StoreInfo }) {
  return (
    <div className="space-y-3 rounded-md bg-gray-50 p-4 ring-1 ring-gray-200">
      <p className="text-sm text-gray-600">
        <span className="font-semibold text-gray-900">Skip the delivery fee.</span>{' '}
        Come grab it during opening hours.
      </p>
      <div className="overflow-hidden rounded-md ring-1 ring-gray-200">
        <iframe
          src={storeInfo.mapsEmbedUrl}
          width="100%"
          height="220"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          aria-label="Map showing the store location"
          className="block"
        />
      </div>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold text-gray-900">Address</dt>
          <dd className="text-gray-700">{storeInfo.address}</dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Hours</dt>
          <dd className="text-gray-700">
            {storeInfo.hours.weekdays}
            <br />
            {storeInfo.hours.saturday}
            <br />
            {storeInfo.hours.sunday}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Call</dt>
          <dd>
            <a href={`tel:${storeInfo.phone}`} className="text-primary-600 hover:underline">
              {storeInfo.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-gray-900">Email</dt>
          <dd>
            <a href={`mailto:${storeInfo.email}`} className="text-primary-600 hover:underline">
              {storeInfo.email}
            </a>
          </dd>
        </div>
      </dl>
      <a
        href={`https://wa.me/${storeInfo.whatsapp}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        <span aria-hidden="true">💬 </span>Message us on WhatsApp
      </a>
    </div>
  );
}

// ---------- Step 3: Payment ----------

function StepPayment({
  methods,
  value,
  onChange,
}: {
  methods: Method[];
  value: string;
  onChange: (id: string) => void;
}) {
  const uid = useId();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-gray-900">How would you like to pay?</h2>
        <p className="mt-1 text-sm text-gray-600">
          We don't charge anything online. Our team will share the relevant
          details (MMG number, bank account, etc.) when we confirm the order.
        </p>
      </div>
      {methods.length === 0 && (
        <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
          No payment methods are currently configured. Please contact us via
          WhatsApp to complete this order.
        </div>
      )}
      <div className="space-y-2">
        {methods.map((m) => (
          <label
            key={m.id}
            htmlFor={`${uid}-${m.id}`}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-4 ${
              value === m.id ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              id={`${uid}-${m.id}`}
              type="radio"
              name={`${uid}-payment`}
              value={m.id}
              checked={value === m.id}
              onChange={() => onChange(m.id)}
              className="mt-1 h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-gray-900">{m.name}</span>
              {m.description && (
                <span className="mt-0.5 block text-sm text-gray-600">{m.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------- Order summary ----------

function OrderSummary({ items, subtotal }: { items: CartItem[]; subtotal: number }) {
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul role="list" className="divide-y divide-gray-200">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3 py-3">
              <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 ring-1 ring-gray-200">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-full w-full items-center justify-center text-xl text-gray-300"
                  >
                    📦
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="line-clamp-2 font-medium text-gray-900">{item.name}</span>
                <span className="block text-xs text-gray-500 tabular-nums">
                  Qty {item.quantity} · {formatPrice(item.price)}
                </span>
              </span>
              <span className="shrink-0 self-start text-sm font-semibold tabular-nums text-gray-900">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-gray-200 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-600">Items ({totalUnits})</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="font-semibold text-gray-900">Subtotal</dt>
            <dd className="text-lg font-bold tabular-nums text-gray-900">{formatPrice(subtotal)}</dd>
          </div>
        </dl>
        <p className="text-xs text-gray-500">
          The final total may differ — delivery fees (if any) and item
          availability are confirmed by our team before payment.
        </p>
      </div>
    </aside>
  );
}

// ---------- Radio card ----------

function RadioCard({
  name,
  id,
  checked,
  onChange,
  title,
  subtitle,
  icon,
}: {
  name: string;
  id: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle: string;
  icon: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex cursor-pointer items-center gap-3 rounded-md border p-4 ${
        checked ? 'border-primary-600 bg-primary-50' : 'border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
      />
      <span aria-hidden="true" className="text-2xl">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-gray-900">{title}</span>
        <span className="block text-xs text-gray-600">{subtitle}</span>
      </span>
    </label>
  );
}
