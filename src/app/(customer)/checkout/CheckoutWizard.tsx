'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import {
  selectDiscountAmount,
  selectSubtotal,
  selectTotal,
  useCartHydrated,
  useCartStore,
} from '@/lib/cart/store';
import { formatPrice } from '@/lib/utils';
import type { CartItem } from '@/lib/cart/types';
import type { AppliedDiscount } from '@/types/discount';
import { placeOrderAction, lookupCustomerAction } from './actions';

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
  customer: { name: string; phone: string; email: string };
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
  const discountAmount = useCartStore(selectDiscountAmount);
  const total = useCartStore(selectTotal);
  const appliedDiscount = useCartStore((s) => s.appliedDiscount);

  const [step, setStep] = useState<StepIdx>(0);
  const [draft, setDraft] = useState<WizardDraft>({
    customer: { name: '', phone: '', email: '' },
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
        <div className="h-12 rounded-md bg-muted" />
        <div className="h-48 rounded-md bg-muted" />
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
    // Email is optional, but if provided it must look like an email.
    const email = draft.customer.email.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Please enter a valid email address, or leave it blank.';
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
        discountCode: appliedDiscount?.code,
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

        <div className="mt-6 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border sm:p-6">
          {/* Each step fades/slides as you advance; mode="wait" so the leaving
              step finishes before the next enters. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
          {step === 0 && (
            <StepCustomer
              value={draft.customer}
              onChange={(c) => setDraft((d) => ({ ...d, customer: c }))}
              onApplyLookup={(r) =>
                setDraft((d) => ({
                  ...d,
                  customer: { ...d.customer, name: r.name },
                  fulfillment: r.delivery
                    ? { type: 'delivery', city: r.delivery.city, address: r.delivery.address }
                    : d.fulfillment,
                }))
              }
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
            </motion.div>
          </AnimatePresence>

          {(stepError || submitError) && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700"
            >
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="sr-only">Error: </span>
                {submitError ?? stepError}
              </span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => goTo((step - 1) as StepIdx)}
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                Back
              </button>
            ) : (
              <Link
                href="/cart"
                className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                Back to cart
              </Link>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-5 py-2.5 font-semibold shadow-sm hover:opacity-90"
              >
                Continue
                <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 py-2.5 font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? 'Placing order…' : 'Place order'}
              </button>
            )}
          </div>
        </div>
      </div>

      <OrderSummary
        items={items}
        subtotal={subtotal}
        discount={appliedDiscount}
        discountAmount={discountAmount}
        total={total}
      />
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
      className="flex flex-col gap-2 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border sm:flex-row sm:items-stretch sm:gap-0"
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
                  ? 'bg-accent'
                  : reachable
                    ? 'hover:bg-muted'
                    : 'cursor-not-allowed opacity-60'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-secondary-foreground'
                }`}
                aria-hidden="true"
              >
                {isDone ? <CheckCircleIcon className="h-5 w-5" /> : i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                  Step {i + 1}
                </span>
                <span className="block text-sm font-semibold text-foreground">
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
  onApplyLookup,
}: {
  value: { name: string; phone: string; email: string };
  onChange: (v: { name: string; phone: string; email: string }) => void;
  onApplyLookup: (r: { name: string; delivery: { city: string; address: string } | null }) => void;
}) {
  const uid = useId();
  const [looking, setLooking] = useState(false);
  const [hint, setHint] = useState<{ tone: 'success' | 'muted'; text: string } | null>(null);
  // Masked email the lookup found on file (e.g. "j••@gmail.com"). Display only —
  // we never receive or prefill the real address.
  const [emailOnFile, setEmailOnFile] = useState<string | null>(null);

  async function findMyInfo() {
    setHint(null);
    const phone = value.phone.trim();
    // Same shape check as validateStep1 — don't fire a lookup on junk input.
    if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) {
      setHint({ tone: 'muted', text: 'Enter your phone number first.' });
      return;
    }
    setLooking(true);
    try {
      const result = await lookupCustomerAction(phone);
      if (result.found) {
        onApplyLookup({ name: result.name, delivery: result.delivery });
        setEmailOnFile(result.emailMasked);
        setHint({ tone: 'success', text: 'Welcome back — we filled in your details.' });
      } else {
        setEmailOnFile(null);
        setHint({ tone: 'muted', text: 'No saved info found — just fill in below.' });
      }
    } catch {
      setEmailOnFile(null);
      setHint({ tone: 'muted', text: 'Couldn’t check right now — just fill in below.' });
    } finally {
      setLooking(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-foreground">Tell us who you are</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We use this to confirm the order and arrange delivery or pickup. No
          account needed.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="text-destructive" aria-hidden="true">*</span> indicates a required field.
        </p>
      </div>
      <div>
        <label htmlFor={`${uid}-phone`} className="block text-sm font-medium text-secondary-foreground">
          Phone number <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`${uid}-phone`}
            type="tel"
            required
            aria-required="true"
            aria-describedby={`${uid}-phone-hint`}
            autoComplete="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => {
              onChange({ ...value, phone: e.target.value });
              if (hint) setHint(null);
            }}
            placeholder="+592 600 0000"
            className="w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
          />
          <button
            type="button"
            onClick={findMyInfo}
            disabled={looking}
            aria-busy={looking}
            aria-label="Find my saved info by phone number"
            className="shrink-0 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent disabled:opacity-50"
          >
            {looking ? 'Looking…' : 'Find my info'}
          </button>
        </div>
        <p
          id={`${uid}-phone-hint`}
          className="mt-1 text-xs text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          {hint ? (
            <span className={hint.tone === 'success' ? 'font-medium text-green-700' : 'text-muted-foreground'}>
              {hint.text}
            </span>
          ) : (
            <>Returning customer? Enter your phone and tap “Find my info”. We’ll call or WhatsApp to confirm.</>
          )}
        </p>
      </div>
      <div>
        <label htmlFor={`${uid}-name`} className="block text-sm font-medium text-secondary-foreground">
          Full name <span className="text-destructive" aria-hidden="true">*</span>
        </label>
        <input
          id={`${uid}-name`}
          type="text"
          required
          aria-required="true"
          autoComplete="name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Jane Doe"
          className="mt-1 w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
        />
      </div>
      <div>
        <label htmlFor={`${uid}-email`} className="block text-sm font-medium text-secondary-foreground">
          Email <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id={`${uid}-email`}
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-describedby={`${uid}-email-hint`}
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="jane@example.com"
          className="mt-1 w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
        />
        <p id={`${uid}-email-hint`} className="mt-1 text-xs text-muted-foreground">
          {emailOnFile && value.email.trim() === '' ? (
            <span className="font-medium text-green-700">
              We have {emailOnFile} on file — leave blank to keep it, or enter a
              new address.
            </span>
          ) : (
            <>
              Add your email and we’ll send an order confirmation. We’ll still
              call or WhatsApp to finalise.
            </>
          )}
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
        <h2 className="text-lg font-bold text-foreground">How would you like to receive it?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
        <fieldset className="space-y-3 rounded-md bg-muted p-4 ring-1 ring-border">
          <legend className="px-1 text-sm font-semibold text-foreground">Delivery address</legend>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Same-day in Georgetown.</span>{' '}
            2–5 days nationwide. We confirm a delivery window when we call.
          </p>
          <div>
            <label htmlFor={`${uid}-city`} className="block text-sm font-medium text-secondary-foreground">
              City / town <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <input
              id={`${uid}-city`}
              type="text"
              required
              aria-required="true"
              autoComplete="address-level2"
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="Georgetown"
              className="mt-1 w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor={`${uid}-address`} className="block text-sm font-medium text-secondary-foreground">
              Street address <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <textarea
              id={`${uid}-address`}
              required
              aria-required="true"
              autoComplete="street-address"
              rows={3}
              value={value.address}
              onChange={(e) => onChange({ ...value, address: e.target.value })}
              placeholder="House number, street, ward, landmarks…"
              className="mt-1 w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring"
            />
          </div>
        </fieldset>
      )}

      {value.type === 'pickup' && (
        <PickupCard storeInfo={storeInfo} />
      )}
    </div>
  );
}

function PickupCard({ storeInfo }: { storeInfo: StoreInfo }) {
  return (
    <div className="space-y-3 rounded-md bg-muted p-4 ring-1 ring-border">
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">Skip the delivery fee.</span>{' '}
        Come grab it during opening hours.
      </p>
      <div className="overflow-hidden rounded-md ring-1 ring-border">
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
          <dt className="font-semibold text-foreground">Address</dt>
          <dd className="text-secondary-foreground">{storeInfo.address}</dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Hours</dt>
          <dd className="text-secondary-foreground">
            {storeInfo.hours.weekdays}
            <br />
            {storeInfo.hours.saturday}
            <br />
            {storeInfo.hours.sunday}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Call</dt>
          <dd>
            <a href={`tel:${storeInfo.phone}`} className="text-primary hover:underline">
              {storeInfo.phone}
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-foreground">Email</dt>
          <dd>
            <a href={`mailto:${storeInfo.email}`} className="text-primary hover:underline">
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
        <h2 className="text-lg font-bold text-foreground">How would you like to pay?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
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
              value === m.id ? 'border-primary bg-accent' : 'border-border hover:bg-muted'
            }`}
          >
            <input
              id={`${uid}-${m.id}`}
              type="radio"
              name={`${uid}-payment`}
              value={m.id}
              checked={value === m.id}
              onChange={() => onChange(m.id)}
              className="mt-1 h-4 w-4 border-border text-primary focus:ring-ring"
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-foreground">{m.name}</span>
              {m.description && (
                <span className="mt-0.5 block text-sm text-muted-foreground">{m.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ---------- Order summary ----------

function OrderSummary({
  items,
  subtotal,
  discount,
  discountAmount,
  total,
}: {
  items: CartItem[];
  subtotal: number;
  discount: AppliedDiscount | null;
  discountAmount: number;
  total: number;
}) {
  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const hasPreOrder = items.some((i) => i.isPreOrder);
  return (
    <aside className="lg:sticky lg:top-32 lg:self-start">
      <div className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul role="list" className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.productId} className="flex gap-3 py-3">
              <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted ring-1 ring-border">
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
                    className="flex h-full w-full items-center justify-center text-xl text-muted-foreground"
                  >
                    📦
                  </span>
                )}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="line-clamp-2 font-medium text-foreground">{item.name}</span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  Qty {item.quantity} · {formatPrice(item.price)}
                </span>
                {item.isPreOrder && (
                  <span className="mt-1 inline-flex w-fit items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                    Pre-order
                  </span>
                )}
              </span>
              <span className="shrink-0 self-start text-sm font-semibold tabular-nums text-foreground">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        {hasPreOrder && (
          <p className="rounded-md bg-blue-50 p-3 text-xs text-blue-900">
            Items marked <span className="font-semibold">Pre-order</span> will be
            confirmed and shipped once stock arrives — payment is collected
            after we confirm.
          </p>
        )}
        <dl className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Items ({totalUnits})</dt>
            <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
          </div>
          {discount && (
            <div className="flex justify-between text-green-700">
              <dt>
                Discount <span className="font-mono text-xs uppercase">({discount.code})</span>
              </dt>
              <dd className="tabular-nums">−{formatPrice(discountAmount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="font-semibold text-foreground">{discount ? 'Total' : 'Subtotal'}</dt>
            <dd className="text-lg font-bold tabular-nums text-foreground">{formatPrice(total)}</dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
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
        checked ? 'border-primary bg-accent' : 'border-border hover:bg-muted'
      }`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-border text-primary focus:ring-ring"
      />
      <span aria-hidden="true" className="text-2xl">{icon}</span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </label>
  );
}
