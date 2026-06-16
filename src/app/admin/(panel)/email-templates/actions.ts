'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';
import { sendTestEmail } from '@/lib/email/send';

const TemplateInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  body_html: z.string().optional().default(''),
  is_active: z.coerce.boolean().default(true),
});

export type TemplateFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  return raw;
}

export async function upsertTemplate(
  _prev: TemplateFormState,
  fd: FormData,
): Promise<TemplateFormState> {
  const { user } = await requirePageAccess('email-templates');
  const parsed = TemplateInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const supabase = createAdminClient();

  if (input.id) {
    // Editing: slug is immutable (system rows especially must keep their key).
    const { error } = await supabase
      .from('email_templates')
      .update({
        name: input.name,
        subject: input.subject,
        body_html: input.body_html ?? '',
        is_active: input.is_active,
        modified_by: user.id,
      })
      .eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const slug = (input.slug?.trim() || generateSlug(input.name)).slice(0, 120);
    const { error } = await supabase.from('email_templates').insert({
      name: input.name,
      slug,
      subject: input.subject,
      body_html: input.body_html ?? '',
      is_active: input.is_active,
      is_system: false,
      created_by: user.id,
      modified_by: user.id,
    });
    if (error) {
      if (/duplicate key|unique/.test(error.message)) {
        return {
          error: `A template with slug "${slug}" already exists.`,
          fieldErrors: { slug: 'Already taken — change the name or set an explicit slug.' },
        };
      }
      return { error: error.message };
    }
  }

  revalidatePath('/admin/email-templates');
  redirect('/admin/email-templates');
}

/**
 * Deletes a template. System templates (which back the automatic order emails)
 * are protected — they can be edited but never removed.
 */
export async function deleteTemplate(id: string) {
  await requirePageAccess('email-templates');
  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from('email_templates')
    .select('is_system')
    .eq('id', id)
    .maybeSingle();
  if (row?.is_system) {
    throw new Error('System templates cannot be deleted. Deactivate it instead.');
  }
  const { error } = await supabase.from('email_templates').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/email-templates');
}

export type TestSendState = { ok?: string; error?: string };

/**
 * Sends the saved template (by slug) to a test address using sample data. With
 * no RESEND_API_KEY this records a `logged` row instead of delivering — the UI
 * message reflects which happened.
 */
export async function sendTestTemplate(
  _prev: TestSendState,
  fd: FormData,
): Promise<TestSendState> {
  const { user } = await requirePageAccess('email-templates');
  const slug = String(fd.get('slug') ?? '').trim();
  const to = String(fd.get('to') ?? '').trim();
  if (!slug) return { error: 'Save the template first, then send a test.' };
  if (!to) return { error: 'Enter an email address to send the test to.' };

  const result = await sendTestEmail({ slug, to, sentBy: user.id });
  revalidatePath('/admin/email-templates');
  if (result.status === 'sent') return { ok: `Test sent to ${to}.` };
  if (result.status === 'logged') {
    return {
      ok: `Logged (not delivered): RESEND_API_KEY isn't set, so the email was recorded but not sent. Set the key to deliver for real.`,
    };
  }
  return { error: result.error ?? 'Could not send the test email.' };
}
