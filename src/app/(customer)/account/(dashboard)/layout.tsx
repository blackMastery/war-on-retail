import { requireCustomer } from '@/lib/customer/auth';
import DashboardNav from './DashboardNav';

export const metadata = { title: 'My account' };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { displayName, user } = await requireCustomer();

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold sm:text-3xl">Hi, {displayName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </header>

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <aside className="md:sticky md:top-28 md:self-start">
          <DashboardNav />
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
