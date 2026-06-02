import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `customers` page permission for the list and detail routes. */
export default async function CustomersSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('customers');
  return <>{children}</>;
}
