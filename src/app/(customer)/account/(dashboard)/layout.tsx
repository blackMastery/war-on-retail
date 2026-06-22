import { requireCustomer } from '@/lib/customer/auth';
import DashboardNav from './DashboardNav';

export const metadata = { title: 'My account' };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { displayName, user } = await requireCustomer();

  return (
    <div className="container py-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,15rem)_1fr] lg:grid-cols-[minmax(0,16rem)_1fr]">
        <aside className="md:sticky md:top-28 md:self-start">
          <div className="overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border">
            <div className="border-b border-border bg-sidebar px-4 py-4">
              <p className="truncate font-semibold text-sidebar-foreground">Hi, {displayName}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="p-2">
              <DashboardNav />
            </div>
          </div>
        </aside>

        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
