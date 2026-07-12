import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStoreSettings } from '@/lib/store-settings';
import { formatPrice } from '@/lib/utils';
import { getResend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/email/resend';
import {
  renderTemplate,
  buildSampleVars,
  type EmailBrand,
} from '@/lib/email/render';
import { buildOrderEmailContext, getTemplateBySlug } from '@/lib/email/context';
import type { EmailLogStatus } from '@/types/database';

/** Minimal RFC-5322-ish check — enough to avoid sending to obvious garbage. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SendEmailInput = {
  to: string | null | undefined;
  subject: string;
  html: string;
  templateSlug?: string | null;
  orderId?: string | null;
  sentBy?: string | null;
};

export type SendEmailResult = {
  status: EmailLogStatus;
  providerId?: string | null;
  error?: string | null;
};

/**
 * The single send primitive. Behaviour:
 *   - invalid/missing `to`           → status 'failed' (logged, not thrown)
 *   - no RESEND_API_KEY              → status 'logged' (dev fallback, not sent)
 *   - Resend error                   → status 'failed'
 *   - success                        → status 'sent' (+ provider message id)
 *
 * Always records an `email_log` row and NEVER throws — email is a side effect
 * that must not break order placement or status transitions. Callers may read
 * the returned status if they want to surface it.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = (input.to ?? '').trim();
  const supabase = createAdminClient();

  const record = async (
    status: EmailLogStatus,
    extra: { providerId?: string | null; error?: string | null } = {},
  ): Promise<SendEmailResult> => {
    try {
      await supabase.from('email_log').insert({
        template_slug: input.templateSlug ?? null,
        to_email: to || '(missing)',
        subject: input.subject,
        status,
        provider_id: extra.providerId ?? null,
        error: extra.error ?? null,
        order_id: input.orderId ?? null,
        created_by: input.sentBy ?? null,
      });
    } catch (err) {
      // Logging the log failed — surface to server logs but don't throw.
      console.error('[email] failed to write email_log', err);
    }
    return { status, ...extra };
  };

  if (!to || !EMAIL_RE.test(to)) {
    return record('failed', { error: 'Missing or invalid recipient email' });
  }

  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY not set — logging only. Would send "${input.subject}" to ${to}.`,
    );
    return record('logged');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      replyTo: EMAIL_REPLY_TO,
      subject: input.subject,
      html: input.html,
    });
    if (error) {
      console.error('[email] Resend error', error);
      return record('failed', { error: error.message });
    }
    return record('sent', { providerId: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown send error';
    console.error('[email] send threw', err);
    return record('failed', { error: message });
  }
}

/**
 * Renders the system template `slug` against an order and sends it to the
 * customer's email. Best-effort: silently no-ops when the template is missing
 * or the customer has no email on file (the common case for WhatsApp orders).
 * Returns the result, or null when nothing was attempted.
 */
export async function sendOrderEmail(args: {
  orderId: string;
  slug: string;
  sentBy?: string | null;
}): Promise<SendEmailResult | null> {
  const template = await getTemplateBySlug(args.slug);
  if (!template || !template.is_active) return null;

  const ctx = await buildOrderEmailContext(args.orderId);
  if (!ctx || !ctx.toEmail) return null;

  const { subject, html } = renderTemplate(template, ctx.vars, ctx.brand);
  return sendEmail({
    to: ctx.toEmail,
    subject,
    html,
    templateSlug: args.slug,
    orderId: args.orderId,
    sentBy: args.sentBy ?? null,
  });
}

/**
 * Notifies every active admin that a new order landed. One send (and email_log
 * row) per admin. Best-effort: no-ops when the template is missing/inactive or
 * there are no admin emails; never throws.
 */
export async function sendAdminNewOrderEmails(args: {
  orderId: string;
}): Promise<void> {
  try {
    const template = await getTemplateBySlug('admin_new_order');
    if (!template || !template.is_active) return;

    const ctx = await buildOrderEmailContext(args.orderId);
    if (!ctx) return;

    const supabase = createAdminClient();
    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('email')
      .eq('is_active', true);
    if (error) {
      console.error('[email] failed to load admin recipients', error);
      return;
    }

    const recipients = [
      ...new Set(
        (admins ?? [])
          .map((a) => (a.email ?? '').trim().toLowerCase())
          .filter((e) => e.length > 0),
      ),
    ];
    if (recipients.length === 0) return;

    const { subject, html } = renderTemplate(template, ctx.vars, ctx.brand);
    await Promise.allSettled(
      recipients.map((to) =>
        sendEmail({
          to,
          subject,
          html,
          templateSlug: 'admin_new_order',
          orderId: args.orderId,
        }),
      ),
    );
  } catch (err) {
    console.error('[email] admin new-order notification failed', err);
  }
}

/**
 * Sends a saved template to a test address using the preview sample data, so an
 * admin can verify real delivery (or see the logged fallback) from the editor.
 */
export async function sendTestEmail(args: {
  slug: string;
  to: string;
  sentBy?: string | null;
}): Promise<SendEmailResult> {
  const template = await getTemplateBySlug(args.slug);
  if (!template) {
    return { status: 'failed', error: 'Template not found' };
  }
  const settings = await getStoreSettings();
  const brand: EmailBrand = {
    name: settings.name,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    url: settings.url,
  };
  const vars = buildSampleVars((n) => formatPrice(n));
  // Keep the store vars accurate even in the test.
  vars.site_name = settings.name;
  vars.site_phone = settings.phone;
  vars.site_email = settings.email;
  vars.site_address = settings.address;
  vars.site_whatsapp = settings.whatsapp;

  const { subject, html } = renderTemplate(template, vars, brand);
  return sendEmail({
    to: args.to,
    subject: `[TEST] ${subject}`,
    html,
    templateSlug: args.slug,
    sentBy: args.sentBy ?? null,
  });
}
