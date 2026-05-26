'use client';

import { useActionState, useMemo } from 'react';
import { upsertCategory, type CategoryFormState } from '@/app/admin/(panel)/categories/actions';
import CategoryImageField from '@/components/admin/CategoryImageField';
import type { Category } from '@/types/database';

const initial: CategoryFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';

type Props = {
  category?: Category;
  /** All categories — used to populate the parent dropdown. */
  allCategories: Pick<Category, 'id' | 'name' | 'slug' | 'parent_id'>[];
};

export default function CategoryForm({ category, allCategories }: Props) {
  const [state, action, pending] = useActionState(upsertCategory, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  /**
   * When editing an existing category, exclude it AND its descendants from the
   * parent dropdown — otherwise you could set a category's parent to be its
   * own grandchild and create a cycle. (The server action also catches this,
   * but giving the user a filtered list is friendlier than an error after
   * submit.)
   */
  const parentOptions = useMemo(() => {
    if (!category) return allCategories;
    const blocked = collectDescendants(category.id, allCategories);
    return allCategories.filter((c) => !blocked.has(c.id));
  }, [allCategories, category]);

  return (
    <form action={action} className="space-y-6">
      {category?.id && <input type="hidden" name="id" value={category.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Basics</h2>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Name</span>
          <input
            name="name"
            required
            defaultValue={category?.name}
            placeholder="e.g. Televisions"
            className={INPUT}
          />
          {err('name') && <span className="mt-1 block text-xs text-red-600">{err('name')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Slug <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            name="slug"
            defaultValue={category?.slug ?? ''}
            placeholder="auto-generated from name"
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-gray-500">
            URL becomes <code>/categories/your-slug</code>.
          </span>
          {err('slug') && <span className="mt-1 block text-xs text-red-600">{err('slug')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Description <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={category?.description ?? ''}
            placeholder="A short paragraph shown on the category landing page."
            className={INPUT}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Parent category <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <select
            name="parent_id"
            defaultValue={category?.parent_id ?? ''}
            className={INPUT}
          >
            <option value="">— Top-level (no parent) —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-gray-500">
            Selecting a parent makes this a sub-category (shown nested under the parent on{' '}
            <code>/categories</code>).
          </span>
          {err('parent_id') && (
            <span className="mt-1 block text-xs text-red-600">{err('parent_id')}</span>
          )}
        </label>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-3 font-semibold">Image</h2>
        <CategoryImageField initialUrl={category?.image_url ?? null} />
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Display order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={category?.display_order ?? 0}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Lower numbers appear first.
            </span>
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={category?.is_active ?? true}
              className="rounded text-primary-600"
            />
            Active (visible in storefront)
          </label>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : category ? 'Save changes' : 'Create category'}
        </button>
      </div>
    </form>
  );
}

/** Walk down the parent_id tree to collect all descendants of `rootId` (and itself). */
function collectDescendants(
  rootId: string,
  all: Pick<Category, 'id' | 'parent_id'>[],
): Set<string> {
  const children = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parent_id) continue;
    const list = children.get(c.parent_id) ?? [];
    list.push(c.id);
    children.set(c.parent_id, list);
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
