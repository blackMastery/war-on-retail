import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `categories` permission for list, new, and edit routes. */
export default async function CategoriesSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('categories');
  return <>{children}</>;
}
