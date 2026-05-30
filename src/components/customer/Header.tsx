'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { siteConfig } from '@/config/site';
import { useBodyScrollLock } from '@/lib/useBodyScrollLock';
import CartIcon from './CartIcon';
import SearchBar from './SearchBar';
import NavDropdown, { type NavGroup, type NavItem } from './NavDropdown';
import WishlistIcon from './WishlistIcon';

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  display_order: number;
};
type Brand = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
};

type Props = {
  categories: Category[];
  brands: Brand[];
};

const FEATURED_CATEGORY_SLUGS = ['electronics', 'home-appliances', 'kitchen-appliances'];

export default function Header({ categories, brands }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useBodyScrollLock(mobileMenuOpen);

  // Close drawers on navigation.
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  const { topLevel, childrenOf, featured } = useMemo(() => {
    const top = categories.filter((c) => !c.parent_id);
    const kidsBy = new Map<string, Category[]>();
    for (const c of categories) {
      if (!c.parent_id) continue;
      const list = kidsBy.get(c.parent_id) ?? [];
      list.push(c);
      kidsBy.set(c.parent_id, list);
    }
    const kids = (id: string) => kidsBy.get(id) ?? [];
    const featuredList = FEATURED_CATEGORY_SLUGS
      .map((s) => top.find((c) => c.slug === s))
      .filter((c): c is Category => !!c);
    return { topLevel: top, childrenOf: kids, featured: featuredList };
  }, [categories]);

  const categoryGroups: NavGroup[] = topLevel.map((p) => ({
    label: p.name,
    href: `/categories/${p.slug}`,
    items: childrenOf(p.id).map((c) => ({
      label: c.name,
      href: `/categories/${c.slug}`,
    })),
  }));
  const brandItems: NavItem[] = brands.map((b) => ({
    label: b.name,
    href: `/brands/${b.slug}`,
  }));

  function openSearch() {
    setMobileMenuOpen(false);
    setMobileSearchOpen(true);
  }

  function openMenu() {
    setMobileSearchOpen(false);
    setMobileMenuOpen((v) => !v);
  }

  return (
    <header
      className="sticky top-0 z-40 bg-white shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Utility bar */}
      <div className="bg-surface-dark text-white">
        <div className="container flex items-center justify-between gap-2 py-2 text-xs sm:text-sm">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <a
              href={`tel:${siteConfig.phone}`}
              className="truncate hover:text-accent-400"
            >
              <span aria-hidden="true">📞 </span>
              {siteConfig.phone}
            </a>
            <span aria-hidden="true" className="hidden opacity-50 md:inline">
              |
            </span>
            <span className="hidden opacity-80 md:inline">{siteConfig.hours.weekdays}</span>
          </div>
          <a
            href={`https://wa.me/${siteConfig.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 hover:text-accent-400"
          >
            WhatsApp
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="container flex items-center gap-2 py-3 sm:gap-4 sm:py-4">
        <Link
          href="/"
          aria-label={`${siteConfig.name} home`}
          translate="no"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/logo.png"
            alt={siteConfig.name}
            width={180}
            height={85}
            priority
            className="h-10 w-auto sm:h-12"
          />
        </Link>

        <div className="ml-2 hidden min-w-0 flex-1 md:ml-4 md:flex">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => (mobileSearchOpen ? setMobileSearchOpen(false) : openSearch())}
            aria-label={mobileSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={mobileSearchOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 md:hidden"
          >
            <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <WishlistIcon />
          <CartIcon />
          <button
            type="button"
            onClick={openMenu}
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 md:hidden"
          >
            {mobileMenuOpen ? (
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="container border-t pb-3 pt-3 md:hidden">
          <SearchBar />
        </div>
      )}

      {/* Primary nav — desktop only */}
      <nav aria-label="Primary" className="hidden bg-primary-600 text-white md:block">
        <div className="container flex items-center gap-6 py-3 text-sm font-medium">
          <Link href="/products" className="hover:text-accent-400">
            All Products
          </Link>

          <NavDropdown label="All Categories" width="lg" groups={categoryGroups} />

          <NavDropdown label="Brands" width="md" items={brandItems} />

          {featured.map((c) => {
            const subs = childrenOf(c.id);
            if (subs.length === 0) {
              return (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="hover:text-accent-400"
                >
                  {c.name}
                </Link>
              );
            }
            return (
              <NavDropdown
                key={c.id}
                label={c.name}
                items={[
                  { label: `All ${c.name}`, href: `/categories/${c.slug}` },
                  ...subs.map((s) => ({ label: s.name, href: `/categories/${s.slug}` })),
                ]}
              />
            );
          })}

          <Link href="/deals" className="font-bold hover:text-accent-400">
            <span aria-hidden="true">🔥 </span>Deals
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <nav
            aria-label="Mobile primary"
            className="container flex max-h-[min(70dvh,calc(100dvh-8rem))] flex-col gap-1 overflow-y-auto overscroll-contain py-3 text-sm"
          >
            <MobileLink href="/products" onSelect={() => setMobileMenuOpen(false)}>
              All Products
            </MobileLink>

            <MobileSection label="All Categories">
              <MobileLink
                href="/categories"
                onSelect={() => setMobileMenuOpen(false)}
                className="font-semibold"
              >
                Browse all
              </MobileLink>
              {topLevel.map((p) => (
                <MobileLink
                  key={p.id}
                  href={`/categories/${p.slug}`}
                  onSelect={() => setMobileMenuOpen(false)}
                >
                  {p.name}
                </MobileLink>
              ))}
            </MobileSection>

            <MobileSection label="Brands">
              <MobileLink
                href="/brands"
                onSelect={() => setMobileMenuOpen(false)}
                className="font-semibold"
              >
                All brands
              </MobileLink>
              {brands.map((b) => (
                <MobileLink
                  key={b.id}
                  href={`/brands/${b.slug}`}
                  onSelect={() => setMobileMenuOpen(false)}
                >
                  {b.name}
                </MobileLink>
              ))}
            </MobileSection>

            {featured.map((c) => {
              const subs = childrenOf(c.id);
              if (subs.length === 0) {
                return (
                  <MobileLink
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    onSelect={() => setMobileMenuOpen(false)}
                  >
                    {c.name}
                  </MobileLink>
                );
              }
              return (
                <MobileSection key={c.id} label={c.name}>
                  <MobileLink
                    href={`/categories/${c.slug}`}
                    onSelect={() => setMobileMenuOpen(false)}
                    className="font-semibold"
                  >
                    All {c.name}
                  </MobileLink>
                  {subs.map((s) => (
                    <MobileLink
                      key={s.id}
                      href={`/categories/${s.slug}`}
                      onSelect={() => setMobileMenuOpen(false)}
                    >
                      {s.name}
                    </MobileLink>
                  ))}
                </MobileSection>
              );
            })}

            <MobileLink
              href="/deals"
              onSelect={() => setMobileMenuOpen(false)}
              className="font-bold"
            >
              <span aria-hidden="true">🔥 </span>Deals
            </MobileLink>
          </nav>
        </div>
      )}
    </header>
  );
}

function MobileLink({
  href,
  children,
  onSelect,
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={`flex min-h-11 items-center rounded-md px-3 py-2 hover:bg-gray-100 active:bg-gray-100 ${className}`}
    >
      {children}
    </Link>
  );
}

function MobileSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-md">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 hover:bg-gray-100 active:bg-gray-100 [&::-webkit-details-marker]:hidden">
        <span>{label}</span>
        <ChevronDownIcon
          className="h-4 w-4 shrink-0 text-gray-500 transition-transform motion-reduce:transition-none group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-gray-200 pl-3">
        {children}
      </div>
    </details>
  );
}
