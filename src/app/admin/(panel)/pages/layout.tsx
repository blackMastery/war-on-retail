import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `pages` permission for the list and edit routes. */
export default async function PagesSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('pages');
  return <>{children}</>;
}
