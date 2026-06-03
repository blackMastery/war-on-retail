import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `discounts` permission for list, new, and edit routes. */
export default async function DiscountsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess('discounts');
  return <>{children}</>;
}
