import Link from 'next/link';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';
import ClearCartOnMount from '../ClearCartOnMount';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return pageMetadata('checkout-success', { title: 'Order placed' });
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  const settings = await getStoreSettings();
  const followUpText = `Hi ${settings.name}, I just placed order ${order}.`;
  return (
    <div className="container py-16">
      {/* Safety net — the wizard already clears on submit, but if the user
          landed here via direct link or refresh we re-clear to avoid leaving
          a "complete" cart hanging. */}
      <ClearCartOnMount />

      <div className="mx-auto max-w-xl rounded-lg bg-white p-8 text-center shadow-sm ring-1 ring-gray-200">
        <CheckCircleIcon
          className="mx-auto h-14 w-14 text-green-500"
          aria-hidden="true"
        />
        <h1 className="mt-4 text-2xl font-bold text-gray-900 sm:text-3xl">
          Order placed
        </h1>
        <p className="mt-2 text-gray-600">
          Thanks — we&apos;ve got it. Someone from{' '}
          <span translate="no">{settings.name}</span> will reach the phone you
          provided to confirm availability and arrange payment.
        </p>

        {order && (
          <div className="mt-6 rounded-md bg-primary-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
              Your order number
            </p>
            <p className="mt-1 select-all font-mono text-lg font-bold text-primary-900">
              {order}
            </p>
            <p className="mt-1 text-xs text-primary-700">
              Keep this handy. Quote it when you message us if you have questions.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/products"
            className="rounded-md bg-primary-600 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-primary-700"
          >
            Keep shopping
          </Link>
          <a
            href={`https://wa.me/${settings.whatsapp}${
              order ? `?text=${encodeURIComponent(followUpText)}` : ''
            }`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-green-600 px-5 py-2.5 font-semibold text-green-700 hover:bg-green-50"
          >
            <span aria-hidden="true">💬 </span>Talk to us on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
