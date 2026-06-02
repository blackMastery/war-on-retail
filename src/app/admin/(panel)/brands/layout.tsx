import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `brands` permission for list, new, and edit routes. */
export default async function BrandsSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('brands');
  return <>{children}</>;
}
