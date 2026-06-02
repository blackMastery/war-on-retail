import 'server-only';
import { getPageSeo } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';

/**
 * Expands the admin-editable placeholders in a Markdown body against the
 * live store settings. Keeps contact details (name, phone, WhatsApp, email,
 * address) automatically in sync with `/admin/settings` so the admin doesn't
 * have to keep editing the body whenever those change.
 *
 * Recognised placeholders:
 *   {{site_name}}     → settings.name
 *   {{site_phone}}    → settings.phone
 *   {{site_email}}    → settings.email
 *   {{site_address}}  → settings.address
 *   {{site_whatsapp}} → settings.whatsapp (digits only)
 */
function applyTemplate(
  body: string,
  vars: { name: string; phone: string; email: string; address: string; whatsapp: string },
): string {
  return body
    .replaceAll('{{site_name}}', vars.name)
    .replaceAll('{{site_phone}}', vars.phone)
    .replaceAll('{{site_email}}', vars.email)
    .replaceAll('{{site_address}}', vars.address)
    .replaceAll('{{site_whatsapp}}', vars.whatsapp);
}

/**
 * Loads the Markdown body for a `page_seo` row, applying placeholder
 * substitution. Returns `null` when the row has no body (most non-policy
 * pages) — the customer page falls back to whatever empty state it wants.
 *
 * Both inputs are React-cache-wrapped, so calling this in a layout AND a
 * page (or in `generateMetadata`) within one request still issues only the
 * two underlying Supabase round-trips once.
 */
export async function getPageBody(
  id: string,
): Promise<{ markdown: string; updatedAt: string } | null> {
  const [seo, settings] = await Promise.all([getPageSeo(id), getStoreSettings()]);
  if (!seo?.body_markdown) return null;
  const markdown = applyTemplate(seo.body_markdown, {
    name: settings.name,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    whatsapp: settings.whatsapp,
  });
  return { markdown, updatedAt: seo.updated_at };
}
