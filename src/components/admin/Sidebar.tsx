'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ADMIN_PAGES, DASHBOARD_KEY } from '@/lib/admin/pages';

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

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="border-b border-gray-200 p-4">
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
        <p className="mt-1 text-xs uppercase tracking-wide text-gray-400">Admin</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {nav.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                active
                  ? 'bg-primary-50 font-semibold text-primary-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-3 text-xs">
        {bootstrap && (
          <div className="mb-2 rounded-md bg-yellow-50 p-2 text-[11px] leading-tight text-yellow-800 ring-1 ring-yellow-200">
            <p className="font-semibold">Bootstrap access</p>
            <p className="mt-0.5">
              You&apos;re in via <code>ADMIN_ALLOWED_EMAILS</code>. Persist this:
            </p>
            <pre className="mt-1 select-all whitespace-pre-wrap font-mono">{`select make_admin('${email}');`}</pre>
            <p className="mt-1">Run it in the Supabase SQL editor, then remove your email from the env.</p>
          </div>
        )}
        <p className="truncate text-gray-500">{email}</p>
        <button
          type="button"
          onClick={signOut}
          className="mt-2 w-full rounded-md border border-gray-300 px-2 py-1.5 text-left font-medium hover:bg-gray-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
