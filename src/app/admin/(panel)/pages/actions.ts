'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';

const PageSeoInput = z.object({
  id: z.string().min(1),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_keywords: z.string().optional().nullable(),
  robots_index: z.coerce.boolean().default(true),
  // Markdown body for long-form pages (/about + policies). Other rows
  // submit this field empty and it's coerced to null below.
  body_markdown: z.string().optional().nullable(),
});

export type PageSeoFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  raw.robots_index = String(
    fd.get('robots_index') === 'on' || fd.get('robots_index') === 'true',
  );
  return raw;
}

export async function upsertPageSeo(
  _prev: PageSeoFormState,
  fd: FormData,
): Promise<PageSeoFormState> {
  const { user } = await requirePageAccess('pages');
  const parsed = PageSeoInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  // Trim + coerce empty strings to null so a cleared input wipes the override
  // and the customer page falls back to its compile-time default.
  const clean = (s: string | null | undefined) =>
    s && s.trim() ? s.trim() : null;

  const payload = {
    meta_title: clean(input.meta_title),
    meta_description: clean(input.meta_description),
    meta_keywords: clean(input.meta_keywords),
    robots_index: input.robots_index,
    // Preserve internal whitespace in the markdown — only trim outer edges.
    body_markdown: input.body_markdown && input.body_markdown.trim()
      ? input.body_markdown.replace(/\r\n/g, '\n')
      : null,
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('page_seo')
    .update({ ...payload, modified_by: user.id })
    .eq('id', input.id);
  if (error) return { error: error.message };

  // The customer chrome reads page_seo through React.cache (request-scoped),
  // so we only need to bust the route-segment cache for the entire site.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/pages');
  revalidatePath(`/admin/pages/${input.id}/edit`);
  return {};
}
