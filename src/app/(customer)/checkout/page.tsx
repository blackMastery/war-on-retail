import { createClient } from '@/lib/supabase/server';
import { getStoreSettings } from '@/lib/store-settings';
import { getCustomerContext } from '@/lib/customer/auth';
import { pageMetadata } from '@/lib/page-seo';
import CheckoutWizard, { type CheckoutPrefill } from './CheckoutWizard';

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

  // Signed-in shoppers skip the "Find my info" dance — prefill from their linked
  // customer record (most recent) plus their last delivery address. RLS scopes
  // both reads to this user. Guests get a null prefill and the manual flow.
  const ctx = await getCustomerContext();
  let prefill: CheckoutPrefill = null;
  if (ctx) {
    const customer = ctx.customers[0];
    let delivery: { city: string; address: string } | null = null;
    if (ctx.customers.length > 0) {
      const { data: lastDelivery } = await supabase
        .from('orders')
        .select('delivery_city, delivery_address')
        .in(
          'customer_id',
          ctx.customers.map((c) => c.id),
        )
        .eq('fulfillment_type', 'delivery')
        .not('delivery_address', 'is', null)
        .order('placed_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lastDelivery?.delivery_address) {
        delivery = {
          city: lastDelivery.delivery_city ?? '',
          address: lastDelivery.delivery_address,
        };
      }
    }
    const metaName =
      typeof ctx.user.user_metadata?.full_name === 'string'
        ? ctx.user.user_metadata.full_name.trim()
        : '';
    prefill = {
      name: customer?.name ?? metaName,
      phone: customer?.phone ?? '',
      email: customer?.email ?? ctx.user.email ?? '',
      delivery,
    };
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold sm:text-3xl">Checkout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Three quick steps. Nothing is charged here — our team confirms the order
        before payment.
      </p>
      <div className="mt-6">
        <CheckoutWizard methods={paymentMethods ?? []} storeInfo={storeInfo} prefill={prefill} />
      </div>
    </div>
  );
}
