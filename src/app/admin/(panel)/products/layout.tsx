import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `products` permission for list, new, edit, and CSV import. */
export default async function ProductsSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('products');
  return <>{children}</>;
}
