'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { siteConfig } from '@/config/site';
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

/**
 * Top-level shortcut categories to surface as their own dropdowns in the
 * primary nav. Anything not on this list still appears inside the "All
 * Categories" mega-menu — this just controls which ones get a dedicated tab.
 */
const FEATURED_CATEGORY_SLUGS = ['electronics', 'home-appliances', 'kitchen-appliances'];

export default function Header({ categories, brands }: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Derive nav data once per render.
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

  return (
    <header
      className="sticky top-0 z-40 bg-white shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Utility bar */}
      <div className="bg-gray-900 text-white">
        <div className="container flex items-center justify-between py-2 text-xs sm:text-sm">
          <div className="flex min-w-0 items-center gap-4">
            <a href={`tel:${siteConfig.phone}`} className="hover:text-primary-300">
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
            className="hover:text-primary-300"
          >
            WhatsApp us
          </a>
        </div>
      </div>

      {/* Main bar */}
      <div className="container flex items-center gap-4 py-4">
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
            className="h-12 w-auto"
          />
        </Link>

        <div className="ml-4 hidden min-w-0 flex-1 md:flex">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileSearchOpen((v) => !v)}
            aria-label="Toggle search"
            aria-expanded={mobileSearchOpen}
            className="rounded-full p-2 hover:bg-gray-100 md:hidden"
          >
            <MagnifyingGlassIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <WishlistIcon />
          <CartIcon />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
            className="rounded-full p-2 hover:bg-gray-100 md:hidden"
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
        <div className="container pb-3 md:hidden">
          <SearchBar />
        </div>
      )}

      {/* Primary nav — desktop */}
      <nav aria-label="Primary" className="bg-primary-600 text-white">
        <div className="container hidden items-center gap-6 py-3 text-sm font-medium md:flex">
          <Link href="/products" className="hover:text-primary-100">
            All Products
          </Link>

          <NavDropdown label="All Categories" width="lg" groups={categoryGroups} />

          <NavDropdown label="Brands" width="md" items={brandItems} />

          {featured.map((c) => {
            const subs = childrenOf(c.id);
            // If a featured top-level has no children, fall back to a plain link.
            if (subs.length === 0) {
              return (
                <Link
                  key={c.id}
                  href={`/categories/${c.slug}`}
                  className="hover:text-primary-100"
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

          <Link href="/deals" className="font-bold hover:text-primary-100">
            <span aria-hidden="true">🔥 </span>Deals
          </Link>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-white md:hidden">
          <nav aria-label="Mobile primary" className="container flex flex-col gap-1 py-3 text-sm">
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

/** A single tap target inside the mobile nav drawer. */
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
      className={`rounded-md px-2 py-2 hover:bg-gray-100 ${className}`}
    >
      {children}
    </Link>
  );
}

/**
 * Collapsible mobile section using <details>/<summary>. Native semantics +
 * keyboard handling come for free; we just style the chevron.
 */
function MobileSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-md">
      <summary className="flex cursor-pointer items-center justify-between rounded-md px-2 py-2 hover:bg-gray-100">
        <span>{label}</span>
        <ChevronDownIcon
          className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-gray-200 pl-3">
        {children}
      </div>
    </details>
  );
}
