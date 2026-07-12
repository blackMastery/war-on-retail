/**
 * Pure, browser-safe email rendering. No server-only imports here — the admin
 * editor's live preview calls `renderTemplate` in the browser, and `sendEmail`
 * calls it on the server. Everything it needs (store branding, the variable
 * values) is passed in.
 *
 * Templates use the same `{{placeholder}}` convention as page bodies
 * (see src/lib/page-body.ts). Unknown placeholders render as empty strings.
 */

/** Minimal store branding the layout needs. A subset of ResolvedStoreSettings. */
export type EmailBrand = {
  name: string;
  email: string;
  phone: string;
  address: string;
  url: string;
};

/** Flat map of `{{key}}` → value. Values are plain text unless listed in RAW_HTML_VARS. */
export type EmailVars = Record<string, string>;

/** Variables whose values are already HTML and must NOT be escaped. */
const RAW_HTML_VARS = new Set(['order_items']);

/** Brand amber — kept in sync with tailwind `primary`. */
const BRAND_PRIMARY = '#C91919';

/**
 * Catalogue of supported variables, surfaced in the editor as an insert palette
 * and used to build the preview sample. `sample` is what the live preview shows.
 */
export type EmailVariableDef = {
  key: string;
  label: string;
  description: string;
  sample: string;
};

export const EMAIL_VARIABLES: EmailVariableDef[] = [
  { key: 'customer_name', label: 'Customer name', description: "The customer's name", sample: 'Jordan Singh' },
  { key: 'customer_phone', label: 'Customer phone', description: "The customer's phone number", sample: '+5926123456' },
  { key: 'order_number', label: 'Order number', description: 'e.g. WOR-2026-000042', sample: 'WOR-2026-000042' },
  { key: 'order_status', label: 'Order status', description: 'pending / approved / fulfilled / cancelled', sample: 'approved' },
  { key: 'order_total', label: 'Order total', description: 'Payable total, formatted', sample: 'GYD $125,000' },
  { key: 'order_date', label: 'Order date', description: 'When the order was placed', sample: '15 June 2026' },
  { key: 'order_items', label: 'Order items', description: 'Itemised table of the order', sample: '' },
  {
    key: 'admin_order_url',
    label: 'Admin order URL',
    description: 'Direct link to the order in /admin',
    sample: 'https://www.waronretailguyana.com/admin/orders/00000000-0000-0000-0000-000000000001',
  },
  { key: 'site_name', label: 'Store name', description: 'From store settings', sample: 'War on Retail' },
  { key: 'site_phone', label: 'Store phone', description: 'From store settings', sample: '592-694-3827' },
  { key: 'site_email', label: 'Store email', description: 'From store settings', sample: 'info@waronretail.com' },
  { key: 'site_address', label: 'Store address', description: 'From store settings', sample: 'Georgetown, Guyana' },
  { key: 'site_whatsapp', label: 'Store WhatsApp', description: 'Digits only', sample: '5926943827' },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Substitutes every `{{key}}` token. In HTML context, plain-text values are
 * escaped (so a customer name with `<` can't break the markup); values for
 * RAW_HTML_VARS keys are injected as-is. Tokens with no matching var → ''.
 */
function substitute(input: string, vars: EmailVars, html: boolean): string {
  return input.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_match, key: string) => {
    const value = vars[key];
    if (value == null) return '';
    if (html && !RAW_HTML_VARS.has(key)) return escapeHtml(value);
    return value;
  });
}

/**
 * Wraps an email body in the branded, mobile-friendly shell. Inline styles only
 * (email clients strip <style>/external CSS) using a centred table layout.
 */
export function renderLayout(innerHtml: string, brand: EmailBrand): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
<tr><td style="background:${BRAND_PRIMARY};padding:20px 28px;">
<span style="font-size:20px;font-weight:bold;color:#000000;letter-spacing:0.3px;">${escapeHtml(brand.name)}</span>
</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#1f2937;">
${innerHtml}
</td></tr>
<tr><td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280;">
<p style="margin:0 0 6px 0;">${escapeHtml(brand.name)} — ${escapeHtml(brand.address)}</p>
<p style="margin:0 0 6px 0;">Phone ${escapeHtml(brand.phone)} · <a href="mailto:${escapeHtml(brand.email)}" style="color:${BRAND_PRIMARY};text-decoration:none;">${escapeHtml(brand.email)}</a></p>
<p style="margin:0;color:#9ca3af;">You're receiving this because you placed an order or asked us to keep you posted. Reply to this email to unsubscribe.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Renders a template into a ready-to-send `{ subject, html }`. The subject is
 * substituted in plain-text context; the body is substituted in HTML context
 * and wrapped in the branded layout.
 */
export function renderTemplate(
  template: { subject: string; body_html: string },
  vars: EmailVars,
  brand: EmailBrand,
): { subject: string; html: string } {
  const subject = substitute(template.subject, vars, false);
  const body = substitute(template.body_html, vars, true);
  return { subject, html: renderLayout(body, brand) };
}

/**
 * Builds an HTML table of order lines for the `{{order_items}}` variable.
 * `formatMoney` is injected so this stays framework-agnostic (the app passes
 * `formatPrice`).
 */
export function buildOrderItemsHtml(
  items: Array<{ name: string; quantity: number; lineTotal: number }>,
  formatMoney: (n: number) => string,
): string {
  if (items.length === 0) return '';
  const rows = items
    .map(
      (it) =>
        `<tr>
<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${escapeHtml(it.name)} <span style="color:#6b7280;">×${it.quantity}</span></td>
<td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;">${escapeHtml(formatMoney(it.lineTotal))}</td>
</tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 16px 0;">${rows}</table>`;
}

/** Sample variable map for the editor's live preview. */
export function buildSampleVars(formatMoney: (n: number) => string): EmailVars {
  const vars: EmailVars = {};
  for (const v of EMAIL_VARIABLES) vars[v.key] = v.sample;
  vars.order_items = buildOrderItemsHtml(
    [
      { name: 'Samsung 55" 4K TV', quantity: 1, lineTotal: 115000 },
      { name: 'Wall Mount Bracket', quantity: 1, lineTotal: 10000 },
    ],
    formatMoney,
  );
  return vars;
}
