import { requireAdmin } from '@/lib/admin/auth';
import Sidebar from '@/components/admin/Sidebar';

export const dynamic = 'force-dynamic';

/**
 * Chrome for the authenticated admin panel. The route group `(panel)` keeps
 * /admin/login and /admin/auth/* outside this layout so unauthenticated visitors
 * don't get caught in a redirect loop.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const { user, via } = await requireAdmin();

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar email={user.email ?? ''} bootstrap={via === 'env-bootstrap'} />
      <main className="flex-1 overflow-x-hidden">
        <div className="container max-w-6xl py-8">{children}</div>
      </main>
    </div>
  );
}
