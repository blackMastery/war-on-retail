import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `promotions` permission for list, new, and edit routes. */
export default async function PromotionsSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('promotions');
  return <>{children}</>;
}
