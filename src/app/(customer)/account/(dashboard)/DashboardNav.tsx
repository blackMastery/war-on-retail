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
import { cn } from '@/lib/utils';

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
      className="flex w-full flex-row md:w-auto md:flex-col md:gap-1"
    >
      {TABS.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 items-center justify-center gap-2.5 rounded-md px-2 py-2.5 text-sm font-medium transition-colors md:flex-none md:justify-start md:px-3',
              active
                ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon
              className={cn('h-5 w-5 shrink-0', active ? 'text-primary' : 'text-muted-foreground')}
              aria-hidden="true"
            />
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        aria-label={signingOut ? 'Signing out' : 'Sign out'}
        className="flex flex-1 items-center justify-center gap-2.5 rounded-md px-2 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-60 md:mt-1 md:flex-none md:justify-start md:border-t md:border-border md:px-3 md:pt-3"
      >
        <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="hidden md:inline">{signingOut ? 'Signing out…' : 'Sign out'}</span>
      </button>
    </nav>
  );
}
