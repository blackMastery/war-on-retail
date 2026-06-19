'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import { ADMIN_PAGES, DASHBOARD_KEY } from '@/lib/admin/pages';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';

/**
 * Admin chrome — sidebar on desktop, drawer + top bar on mobile.
 *
 * On md+ this renders as a fixed-width left rail (the historical behaviour).
 * On smaller screens the rail becomes an off-canvas drawer; a top bar above
 * the main content carries the hamburger trigger, brand and a sign-out
 * shortcut so the admin always has navigation + an exit even when the
 * drawer is closed.
 */
export default function Sidebar({
  email,
  bootstrap,
  isFullAccess,
  allowedPages,
}: {
  email: string;
  bootstrap?: boolean;
  isFullAccess: boolean;
  allowedPages: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer whenever the route changes (i.e. the user picked a link).
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useBodyScrollLock(drawerOpen);

  // Full-access admins see everything; everyone else sees the always-on
  // dashboard plus the sections explicitly granted to them.
  const granted = new Set(allowedPages);
  const nav = ADMIN_PAGES.filter((page) => {
    if (page.superAdminOnly) return isFullAccess;
    if (isFullAccess || page.key === DASHBOARD_KEY) return true;
    return granted.has(page.key);
  });

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  const asideClasses = [
    // Mobile (default): fixed off-canvas drawer that slides in from the left.
    'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-200 ease-out',
    drawerOpen ? 'translate-x-0' : '-translate-x-full',
    // Desktop (md+): static rail, no transform, no shadow, narrower width.
    'md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 md:border-r md:border-sidebar-border md:shadow-none',
  ].join(' ');

  return (
    <>
      {/* Mobile top bar — visible only below md. Provides the hamburger,
          brand, and a quick sign-out so the admin always has an exit. */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-sidebar px-3 py-2 text-sidebar-foreground md:hidden"
        style={{ paddingTop: 'calc(0.5rem + env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open admin menu"
          aria-expanded={drawerOpen}
          aria-controls="admin-drawer"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <Link
          href="/admin"
          aria-label="War on Retail admin home"
          className="flex items-center"
        >
          <Image
            src="/logo.png"
            alt="War on Retail"
            width={140}
            height={66}
            priority
            className="h-8 w-auto"
          />
        </Link>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      </header>

      {/* Backdrop — visible only when the drawer is open on mobile. */}
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
        />
      )}

      <aside
        id="admin-drawer"
        aria-label="Admin navigation"
        className={asideClasses}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center justify-between border-b border-sidebar-border p-4">
          <Link href="/admin" aria-label="War on Retail admin home" className="block">
            <Image
              src="/logo.png"
              alt="War on Retail"
              width={180}
              height={85}
              priority
              className="h-10 w-auto"
            />
          </Link>
          {/* Close button — only relevant in the mobile drawer state. */}
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-white/10 md:hidden"
          >
            <XMarkIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <p className="px-4 pt-2 text-xs uppercase tracking-wide text-muted-foreground">Admin</p>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm ${
                  active
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground'
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div
          className="border-t border-sidebar-border p-3 text-xs"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {bootstrap && (
            <div className="mb-2 rounded-md bg-sidebar-accent p-2 text-[11px] leading-tight text-sidebar-accent-foreground ring-1 ring-sidebar-border">
              <p className="font-semibold">Bootstrap access</p>
              <p className="mt-0.5">
                You&apos;re in via <code>ADMIN_ALLOWED_EMAILS</code>. Persist this:
              </p>
              <pre className="mt-1 select-all whitespace-pre-wrap font-mono">{`select make_admin('${email}');`}</pre>
              <p className="mt-1">Run it in the Supabase SQL editor, then remove your email from the env.</p>
            </div>
          )}
          <p className="truncate text-muted-foreground">{email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 w-full rounded-md border border-sidebar-border px-2 py-1.5 text-left font-medium hover:bg-white/10"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
