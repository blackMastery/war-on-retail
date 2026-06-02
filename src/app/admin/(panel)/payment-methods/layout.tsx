import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `payment-methods` permission for list, new, and edit routes. */
export default async function PaymentMethodsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePageAccess('payment-methods');
  return <>{children}</>;
}
