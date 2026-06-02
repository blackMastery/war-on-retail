'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';

const FaqInput = z.object({
  id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional().nullable(),
  question: z.string().min(3),
  answer: z.string().min(1),
  keywords_csv: z.string().optional().default(''),
  is_active: z.coerce.boolean().default(true),
});

export type FaqFormState = { error?: string };

export async function upsertFaq(_prev: FaqFormState, fd: FormData): Promise<FaqFormState> {
  await requirePageAccess('chatbot');
  const raw = Object.fromEntries(fd.entries());
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');

  const parsed = FaqInput.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const keywords = parsed.data.keywords_csv
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter(Boolean);

  const payload = {
    category_id: parsed.data.category_id || null,
    question: parsed.data.question,
    answer: parsed.data.answer,
    keywords,
    is_active: parsed.data.is_active,
  };

  const supabase = createAdminClient();
  if (parsed.data.id) {
    const { error } = await supabase.from('faqs').update(payload).eq('id', parsed.data.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('faqs').insert({ ...payload, usage_count: 0 });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/chatbot');
  revalidatePath('/faq');
  return {};
}

export async function deleteFaq(id: string) {
  await requirePageAccess('chatbot');
  const supabase = createAdminClient();
  await supabase.from('faqs').delete().eq('id', id);
  revalidatePath('/admin/chatbot');
  revalidatePath('/faq');
}
