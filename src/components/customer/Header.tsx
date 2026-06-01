'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bars3Icon,
  FireIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TagIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import type { HeaderSettings } from './header-types';
import { categoryIconFor } from '@/lib/category-icons';
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
  image_url: string | null;
};
type Brand = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  logo_url: string | null;
};

type Props = {
  categories: Category[];
  brands: Brand[];
  /** Store settings the header chrome needs — name, phone, weekday hours, whatsapp. */
  settings: HeaderSettings;
};

const FEATURED_CATEGORY_SLUGS = ['electronics', 'home-appliances', 'kitchen-appliances'];

export default function Header({ categories, brands, settings }: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Two-phase mount/show state so the open/close transitions can play:
  //   - `mobileMenuMounted` controls DOM presence (kept true during the
  //      closing animation so the slide-out is visible)
  //   - `mobileMenuShown` controls the visibility classes (translate, opacity)
  // Pattern: mount → next animation frame → flip shown. On close: flip shown
  // → wait the transition duration → unmount.
  const [mobileMenuMounted, setMobileMenuMounted] = useState(false);
  const [mobileMenuShown, setMobileMenuShown] = useState(false);
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileMenuMounted(true);
      // Two nested RAFs: the first lets the browser commit the just-mounted
      // (closed) state to the DOM and paint it; the second flips to open so
      // the transition has two distinct frames to interpolate between. Without
      // the double-RAF, React can batch the mount + state flip into a single
      // frame and the browser skips the animation entirely.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setMobileMenuShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
    setMobileMenuShown(false);
    // Matches the overlay's `duration-300` transition — unmount after the
    // slide-out completes so the user sees the panel leave the screen.
    const t = setTimeout(() => setMobileMenuMounted(false), 300);
    return () => clearTimeout(t);
  }, [mobileMenuOpen]);

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
    <>
    <header
      className="sticky top-0 z-40 bg-white shadow-sm"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Utility bar */}
      <div className="bg-surface-dark text-white">
        <div className="container flex items-center justify-between gap-2 py-2 text-xs sm:text-sm">
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <a
              href={`tel:${settings.phone}`}
              className="truncate hover:text-accent-400"
            >
              <span aria-hidden="true">📞 </span>
              {settings.phone}
            </a>
            <span aria-hidden="true" className="hidden opacity-50 md:inline">
              |
            </span>
            <span className="hidden opacity-80 md:inline">{settings.hoursWeekdays}</span>
          </div>
          <a
            href={`https://wa.me/${settings.whatsapp}`}
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
          aria-label={`${settings.name} home`}
          translate="no"
          className="flex shrink-0 items-center"
        >
          <Image
            src="/logo.png"
            alt={settings.name}
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

    </header>

      {/* Mobile menu — full-screen overlay with its own self-contained top bar
          (logo + close button). Built this way deliberately, NOT as a drawer
          anchored below the sticky header, because:
          1. iOS Safari's body→html overflow propagation breaks `position:
             sticky` whenever the scroll lock kicks in — the sticky header would
             drop to the top of the document and the user, scrolled to the
             bottom, would see no header at all (the bug this iteration fixes).
          2. A full-screen overlay is the dominant mobile e-commerce pattern
             (Amazon, Best Buy, Target). No backdrop, no half-state — the menu
             owns the viewport while open and gets out of the way completely
             when closed. */}
      {mobileMenuMounted && (
        <>
          {/* Backdrop — fades in alongside the drawer's slide. Tap to close.
              This is what gives the menu its "app drawer" feel: the user can
              still see (dimmed) where they were on the page, and the menu
              feels layered over context rather than replacing it. */}
          <div
            role="presentation"
            onClick={() => setMobileMenuOpen(false)}
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-out md:hidden motion-reduce:transition-none ${
              mobileMenuShown ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          />
        <div
          // Side drawer: ~85% of viewport width capped at ~360 px, slides in
          // from the left edge. Parked off-screen at -translate-x-full when
          // closed, slides to translate-x-0 on open. ease-out keeps the
          // motion feeling responsive (most velocity at the start) rather
          // than the sluggish ease-in-out default. The right-edge shadow
          // gives the drawer depth against the backdrop.
          className={`fixed bottom-0 left-0 top-0 z-50 flex w-[85%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out will-change-transform md:hidden motion-reduce:transition-none ${
            mobileMenuShown ? 'translate-x-0' : 'pointer-events-none -translate-x-full'
          }`}
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Self-contained top bar: matches the visible header bar so the
              user never feels the chrome "disappeared", and carries the X
              close button so dismissal is always one tap. */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3 sm:px-4 sm:py-4">
            <Link
              href="/"
              aria-label={`${settings.name} home`}
              translate="no"
              onClick={() => setMobileMenuOpen(false)}
              className="flex shrink-0 items-center"
            >
              <Image
                src="/logo.png"
                alt={settings.name}
                width={180}
                height={85}
                className="h-10 w-auto sm:h-12"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close navigation"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
            >
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <nav
            aria-label="Mobile primary"
            className="container flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain py-3 text-sm"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            <MobileLink
              href="/products"
              onSelect={() => setMobileMenuOpen(false)}
              thumbnail={<UtilityThumb icon={ShoppingBagIcon} tone="primary" />}
            >
              All Products
            </MobileLink>

            <MobileSection
              label="All Categories"
              thumbnail={<UtilityThumb icon={Squares2X2Icon} />}
            >
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
                  thumbnail={<CategoryThumb imageUrl={p.image_url} slug={p.slug} />}
                >
                  {p.name}
                </MobileLink>
              ))}
            </MobileSection>

            <MobileSection label="Brands" thumbnail={<UtilityThumb icon={TagIcon} />}>
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
                  thumbnail={<BrandThumb logoUrl={b.logo_url} name={b.name} />}
                >
                  {b.name}
                </MobileLink>
              ))}
            </MobileSection>

            {featured.map((c) => {
              const subs = childrenOf(c.id);
              const thumb = <CategoryThumb imageUrl={c.image_url} slug={c.slug} />;
              if (subs.length === 0) {
                return (
                  <MobileLink
                    key={c.id}
                    href={`/categories/${c.slug}`}
                    onSelect={() => setMobileMenuOpen(false)}
                    thumbnail={thumb}
                  >
                    {c.name}
                  </MobileLink>
                );
              }
              return (
                <MobileSection key={c.id} label={c.name} thumbnail={thumb}>
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
              thumbnail={<UtilityThumb icon={FireIcon} tone="deal" />}
            >
              Deals
            </MobileLink>
          </nav>
        </div>
        </>
      )}
    </>
  );
}

function MobileLink({
  href,
  children,
  onSelect,
  className = '',
  thumbnail,
}: {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
  className?: string;
  /** Optional 32 × 32 visual leading the label. See `<CategoryThumb>` / `<BrandThumb>`. */
  thumbnail?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className={`flex min-h-11 items-center gap-3 rounded-md px-3 py-2 hover:bg-gray-100 active:bg-gray-100 ${className}`}
    >
      {thumbnail}
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </Link>
  );
}

function MobileSection({
  label,
  children,
  thumbnail,
}: {
  label: string;
  children: React.ReactNode;
  /** Optional 32 × 32 visual leading the section label in the summary row. */
  thumbnail?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    // Custom button-based accordion (rather than <details>) so we can animate
    // the open/close. <details> hides its content via display:none which can't
    // be transitioned. The grid-template-rows 0fr→1fr trick is the modern
    // smooth way to animate auto-height collapse without measuring children.
    <div className="rounded-md">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-gray-100 active:bg-gray-100"
      >
        {thumbnail}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 motion-reduce:transition-none ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="ml-3 mt-1 flex flex-col gap-0.5 border-l border-gray-200 pl-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 32 × 32 thumbnail for a category in the mobile menu.
 *
 * When `image_url` is set, renders it on a soft gray plate so transparent PNGs
 * still look intentional. Otherwise renders the slug's emoji fallback from
 * `categoryIconFor()` so the icon matches what the homepage CategoryCard shows.
 *
 * Decorative — the visible label names the category, so `alt=""` /
 * `aria-hidden` keep AT from announcing it twice.
 */
function CategoryThumb({
  imageUrl,
  slug,
}: {
  imageUrl: string | null;
  slug: string;
}) {
  if (imageUrl) {
    return (
      <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-50 ring-1 ring-gray-200">
        <Image src={imageUrl} alt="" fill sizes="32px" className="object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-gray-50 text-lg leading-none ring-1 ring-gray-200"
    >
      {categoryIconFor(slug)}
    </span>
  );
}

/**
 * 32 × 32 thumbnail for the "utility" rows in the mobile menu — the items
 * that aren't a single category or brand and so don't have a logo/photo:
 * "All Products", "All Categories", "Brands", "Deals".
 *
 * Uses Heroicons (already in the project) instead of emojis here because the
 * neighbouring category rows show real product photography; outline icons on a
 * tinted plate read as deliberate UI affordances rather than mismatched
 * decoration.
 *
 * `tone` lets each row carry a distinct hue (gray for neutral, red/orange for
 * deals) so the menu has a hint of colour vocabulary instead of all-gray.
 */
function UtilityThumb({
  icon: Icon,
  tone = 'gray',
}: {
  icon: typeof ShoppingBagIcon;
  tone?: 'gray' | 'primary' | 'deal';
}) {
  const tones = {
    gray: 'bg-gray-50 text-gray-600 ring-gray-200',
    primary: 'bg-primary-50 text-primary-700 ring-primary-100',
    deal: 'bg-orange-50 text-orange-600 ring-orange-100',
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded ring-1 ${tones[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

/**
 * 32 × 32 thumbnail for a brand in the mobile menu.
 *
 * Falls back to a primary-tinted circle with the brand's first initial — keeps
 * the column visually rhythmic even for brands that haven't uploaded a logo
 * yet, which matters more in a menu than on a card (a wall of empty boxes
 * would be worse than a wall of letters).
 */
function BrandThumb({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  if (logoUrl) {
    return (
      <span className="relative block h-8 w-8 shrink-0 overflow-hidden rounded bg-gray-50 ring-1 ring-gray-200">
        <Image src={logoUrl} alt="" fill sizes="32px" className="object-contain p-0.5" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700 ring-1 ring-primary-100"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
