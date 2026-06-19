'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowLeftOnRectangleIcon,
  HeartIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

const TABS = [
  { href: '/account', label: 'Overview', icon: Squares2X2Icon, exact: true },
  { href: '/account/orders', label: 'Orders', icon: ShoppingBagIcon, exact: false },
  { href: '/account/wishlist', label: 'Wishlist', icon: HeartIcon, exact: false },
  { href: '/account/settings', label: 'Settings', icon: Cog6ToothIcon, exact: false },
] as const;

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <nav
      aria-label="Account"
      className="flex flex-row gap-1 overflow-x-auto md:flex-col md:overflow-visible"
    >
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-red-600 disabled:opacity-60 md:mt-2 md:border-t md:border-border md:pt-3"
      >
        <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </nav>
  );
}
