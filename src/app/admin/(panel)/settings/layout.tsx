import { requirePageAccess } from '@/lib/admin/auth';

/** Enforces the `settings` permission for the store settings route. */
export default async function SettingsSectionLayout({ children }: { children: React.ReactNode }) {
  await requirePageAccess('settings');
  return <>{children}</>;
}
