import { requirePageAccess } from '@/lib/admin/auth';

/**
 * Per-section access guard. Wrapping the section in a layout enforces the
 * `orders` page permission for every route beneath it (list + detail) without
 * repeating the check in each page, mirroring how the panel layout authorises
 * admins in the first place.
 */
export default async function OrdersSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('orders');
  return <>{children}</>;
}
