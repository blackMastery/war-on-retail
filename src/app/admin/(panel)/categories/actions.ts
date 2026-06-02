'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';

const CategoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  image_url: z.string().url().optional().nullable().or(z.literal('')),
  parent_id: z.string().uuid().optional().nullable().or(z.literal('')),
  display_order: z.coerce.number().int().default(0),
  is_active: z.coerce.boolean().default(true),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_keywords: z.string().optional().nullable(),
});

export type CategoryFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  return raw;
}

/**
 * Returns the set of category IDs that are descendants of `rootId`, plus
 * `rootId` itself. Used to prevent a category from being assigned a parent
 * that would create a cycle (e.g. a category can't be its own child).
 */
async function descendantIds(rootId: string): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data: all } = await supabase.from('categories').select('id, parent_id');
  const children = new Map<string, string[]>();
  for (const row of all ?? []) {
    if (!row.parent_id) continue;
    const list = children.get(row.parent_id) ?? [];
    list.push(row.id);
    children.set(row.parent_id, list);
  }
  const out = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    for (const childId of children.get(id) ?? []) {
      if (!out.has(childId)) {
        out.add(childId);
        stack.push(childId);
      }
    }
  }
  return out;
}

export async function upsertCategory(
  _prev: CategoryFormState,
  fd: FormData,
): Promise<CategoryFormState> {
  await requirePageAccess('categories');
  const parsed = CategoryInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const slug = (input.slug?.trim() || generateSlug(input.name)).slice(0, 120);
  const parentId = input.parent_id && input.parent_id !== '' ? input.parent_id : null;

  // Cycle prevention: when editing, the chosen parent must not be one of
  // this category's descendants (or itself).
  if (input.id && parentId) {
    const blocked = await descendantIds(input.id);
    if (blocked.has(parentId)) {
      return {
        error: 'Parent cannot be the category itself or one of its descendants.',
        fieldErrors: { parent_id: 'Would create a cycle.' },
      };
    }
  }

  const clean = (s: string | null | undefined) =>
    s && s.trim() ? s.trim() : null;

  const payload = {
    name: input.name,
    slug,
    description: input.description?.trim() || null,
    image_url: input.image_url && input.image_url !== '' ? input.image_url : null,
    parent_id: parentId,
    display_order: input.display_order,
    is_active: input.is_active,
    meta_title: clean(input.meta_title),
    meta_description: clean(input.meta_description),
    meta_keywords: clean(input.meta_keywords),
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase.from('categories').update(payload).eq('id', input.id);
    if (error) {
      return uniqueViolationToFieldError(error.message, slug) ?? { error: error.message };
    }
  } else {
    const { error } = await supabase.from('categories').insert(payload);
    if (error) {
      return uniqueViolationToFieldError(error.message, slug) ?? { error: error.message };
    }
  }

  revalidatePath('/admin/categories');
  revalidatePath('/categories');
  revalidatePath(`/categories/${slug}`);
  redirect('/admin/categories');
}

/**
 * Soft-deletes by default — sets `is_active = false` so the category vanishes
 * from the storefront. Pass `hard: true` to delete the row entirely.
 *
 * The FK on `products.category_id` and `categories.parent_id` is ON DELETE
 * SET NULL, so a hard delete leaves products uncategorised and child
 * categories orphaned (which makes them top-level).
 */
export async function deleteCategory(id: string, opts: { hard?: boolean } = {}) {
  await requirePageAccess('categories');
  const supabase = createAdminClient();
  const { error } = opts.hard
    ? await supabase.from('categories').delete().eq('id', id)
    : await supabase.from('categories').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/categories');
  revalidatePath('/categories');
}

function uniqueViolationToFieldError(
  message: string,
  slug: string,
): CategoryFormState | null {
  if (!message.includes('duplicate key') && !message.includes('unique')) return null;
  if (message.includes('slug')) {
    return {
      error: `A category with slug "${slug}" already exists.`,
      fieldErrors: { slug: 'Already taken — change the name or set an explicit slug.' },
    };
  }
  if (message.includes('name')) {
    return {
      error: 'A category with that name already exists.',
      fieldErrors: { name: 'Already taken.' },
    };
  }
  return { error: message };
}
