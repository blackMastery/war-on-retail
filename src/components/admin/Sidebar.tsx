'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/products', label: 'Products', icon: '📦' },
  { href: '/admin/products/import', label: 'CSV Import', icon: '⬆️' },
  { href: '/admin/categories', label: 'Categories', icon: '🗂' },
  { href: '/admin/brands', label: 'Brands', icon: '🏷' },
  { href: '/admin/chatbot', label: 'Chatbot FAQs', icon: '🤖' },
] as const;

export default function Sidebar({ email, bootstrap }: { email: string; bootstrap?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/admin/login');
    router.refresh();
  }

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
      <div className="border-b border-gray-200 p-4">
        <Link href="/admin" className="text-lg font-extrabold">
          <span className="text-primary-600">War on</span> Retail
        </Link>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-gray-400">Admin</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
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
              You're in via <code>ADMIN_ALLOWED_EMAILS</code>. Persist this:
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
