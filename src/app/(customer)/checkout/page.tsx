import { createClient } from '@/lib/supabase/server';
import { getStoreSettings } from '@/lib/store-settings';
import { pageMetadata } from '@/lib/page-seo';
import CheckoutWizard from './CheckoutWizard';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return pageMetadata('checkout', { title: 'Checkout' });
}

/**
 * Server entry for the three-step checkout wizard.
 *
 * Responsibilities:
 *   - Load the active payment methods (RLS allows public reads where
 *     `is_active = true`, so the anon server client is fine).
 *   - Resolve the live store settings so the pickup tab renders the current
 *     address/hours/contact and (when set) a precise Google Maps pin from
 *     the admin-configured lat/lng instead of a fuzzy address lookup.
 *
 * Cart-empty redirection happens client-side inside the wizard, because the
 * cart lives in `localStorage` and isn't visible on the server.
 */
export default async function CheckoutPage() {
  const supabase = await createClient();
  const [{ data: paymentMethods }, settings] = await Promise.all([
    supabase
      .from('payment_methods')
      .select('id, name, description, display_order')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    getStoreSettings(),
  ]);

  const storeInfo = {
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    whatsapp: settings.whatsapp,
    hours: settings.hours,
    // GPS-precise when lat/lng are filled in on /admin/settings, otherwise a
    // freeform `?q=<address>` lookup. `output=embed` keeps the iframe key-free.
    mapsEmbedUrl: settings.mapsEmbedUrl,
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Checkout</h1>
      <p className="mt-1 text-sm text-gray-600">
        Three quick steps. Nothing is charged here — our team confirms the order
        before payment.
      </p>
      <div className="mt-6">
        <CheckoutWizard methods={paymentMethods ?? []} storeInfo={storeInfo} />
      </div>
    </div>
  );
}
