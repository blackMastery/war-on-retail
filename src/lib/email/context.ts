import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStoreSettings } from '@/lib/store-settings';
import { formatPrice } from '@/lib/utils';
import {
  buildOrderItemsHtml,
  type EmailBrand,
  type EmailVars,
} from '@/lib/email/render';
import type { EmailTemplateRow } from '@/types/database';

/** Resolves the layout branding subset from live store settings (for previews/sends). */
export async function getEmailBrand(): Promise<EmailBrand> {
  const s = await getStoreSettings();
  return { name: s.name, email: s.email, phone: s.phone, address: s.address, url: s.url };
}

/** Loads one template by its stable slug (service-role read). */
export async function getTemplateBySlug(slug: string): Promise<EmailTemplateRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('email_templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<EmailTemplateRow>();
  return data ?? null;
}

export type OrderEmailContext = {
  vars: EmailVars;
  brand: EmailBrand;
  /** The customer's email, or null when none is on file (caller decides to skip). */
  toEmail: string | null;
};

/**
 * Assembles everything needed to render an order email: the variable map (site
 * vars + order/customer vars + the itemised `{{order_items}}` block), the brand
 * for the layout, and the recipient address. Returns `null` only when the order
 * can't be found.
 */
export async function buildOrderEmailContext(
  orderId: string,
): Promise<OrderEmailContext | null> {
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, status, subtotal, discount_amount, placed_at, customer_id')
    .eq('id', orderId)
    .maybeSingle();
  if (!order) return null;

  const [{ data: customer }, { data: items }, settings] = await Promise.all([
    supabase.from('customers').select('name, email').eq('id', order.customer_id).maybeSingle(),
    supabase
      .from('order_items')
      .select('product_name, quantity, line_total')
      .eq('order_id', orderId),
    getStoreSettings(),
  ]);

  const brand: EmailBrand = {
    name: settings.name,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    url: settings.url,
  };
  const payable = order.subtotal - (order.discount_amount ?? 0);
  const orderItemsHtml = buildOrderItemsHtml(
    (items ?? []).map((it) => ({
      name: it.product_name,
      quantity: it.quantity,
      lineTotal: it.line_total,
    })),
    (n) => formatPrice(n),
  );

  const vars: EmailVars = {
    customer_name: customer?.name ?? 'there',
    order_number: order.order_number,
    order_status: order.status,
    order_total: formatPrice(payable),
    order_date: new Date(order.placed_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
    order_items: orderItemsHtml,
    site_name: brand.name,
    site_phone: brand.phone,
    site_email: brand.email,
    site_address: brand.address,
    site_whatsapp: settings.whatsapp,
  };

  return { vars, brand, toEmail: customer?.email ?? null };
}
