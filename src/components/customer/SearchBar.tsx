'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useDebounce } from '@/lib/useDebounce';
import { formatPrice } from '@/lib/utils';

type Suggestion = {
  id: string;
  slug: string;
  name: string;
  featured_image_url: string | null;
  price: number;
  compare_at_price: number | null;
};

const MIN_QUERY_LEN = 2;
const DEBOUNCE_MS = 200;

/**
 * Header search input with live autocomplete.
 *
 * Behaviour:
 *   - Typing fires a debounced `GET /api/search/suggest?q=…` after 200 ms.
 *   - Up to 8 product rows render in a popover under the input. Each row is
 *     a thumbnail + name + price; clicking navigates to the detail page.
 *   - A trailing "See all results for …" link is always present so the user
 *     can fall back to the full /search page when the top hits don't match.
 *   - Keyboard: ↓ / ↑ move a highlight; Enter on a highlighted row navigates
 *     there; Enter with no highlight submits the form (legacy behaviour);
 *     Esc closes the panel; Tab closes without selecting.
 *   - ARIA: `role="combobox"` wrapper, listbox + option roles, and a
 *     stable `aria-activedescendant` link the input to the highlighted
 *     option for screen-reader users.
 *
 * Rendered twice by the Header (desktop bar + mobile-search row). `useId()`
 * gives each instance its own DOM ids so the ARIA wiring is valid even when
 * both copies live in the DOM at the wrong breakpoint.
 */
export default function SearchBar({
  placeholder = 'Search for products, brands, SKUs…',
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const debouncedQ = useDebounce(q.trim(), DEBOUNCE_MS);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const uid = useId();
  const inputId = `${uid}-input`;
  const listboxId = `${uid}-listbox`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  // Reset highlight whenever the query string the popover is showing changes.
  useEffect(() => {
    setHighlight(-1);
  }, [debouncedQ]);

  // Close the popover on route change. The Header already closes the mobile
  // search row on navigation, but the desktop bar stays mounted across routes
  // — without this it would still show the previous query's suggestions on
  // the new page.
  useEffect(() => {
    setQ('');
    setResults([]);
    setFocused(false);
  }, [pathname]);

  // Debounced fetch — mirrors the AbortController pattern used by
  // RecentlyViewedStrip / WishlistView. Aborts in-flight on rapid keystrokes
  // so out-of-order responses can't overwrite newer ones.
  useEffect(() => {
    if (debouncedQ.length < MIN_QUERY_LEN) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    fetch(`/api/search/suggest?q=${encodeURIComponent(debouncedQ)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { products?: Suggestion[] }) => setResults(data.products ?? []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setResults([]);
      });
    return () => controller.abort();
  }, [debouncedQ]);

  // Outside-click dismissal — same shape as NavDropdown's handler.
  useEffect(() => {
    if (!focused) return;
    function onPointerDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [focused]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    // If the user has a highlight active, navigate to that product instead
    // of running the full search.
    if (highlight >= 0 && results[highlight]) {
      navigateTo(`/products/${results[highlight].slug}`);
      return;
    }
    navigateTo(`/search?q=${encodeURIComponent(query)}`);
  }

  function navigateTo(href: string) {
    setFocused(false);
    setHighlight(-1);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      // First Esc closes the panel; let a second Esc clear the input
      // (matches native browser search input behaviour).
      if (focused && results.length > 0) {
        e.preventDefault();
        setFocused(false);
      }
      return;
    }
    if (e.key === 'Tab') {
      setFocused(false);
      return;
    }
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  }

  const open = focused && q.trim().length >= MIN_QUERY_LEN;
  const hasResults = results.length > 0;
  const showPanel = open && (hasResults || debouncedQ.length >= MIN_QUERY_LEN);

  return (
    <div
      ref={wrapperRef}
      role="combobox"
      aria-expanded={open && hasResults}
      aria-haspopup="listbox"
      aria-owns={listboxId}
      className="relative w-full"
    >
      <form
        onSubmit={onSubmit}
        className="flex w-full items-center rounded-full border border-border bg-card p-1 shadow-sm focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
        role="search"
      >
        <label htmlFor={inputId} className="sr-only">
          Search
        </label>
        <input
          ref={inputRef}
          id={inputId}
          name="q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          role="searchbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            highlight >= 0 && results[highlight] ? optionId(highlight) : undefined
          }
          className="min-w-0 flex-1 rounded-full border-0 bg-transparent py-2 pl-3 text-base text-card-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-0 md:py-1.5 md:pl-4 md:text-sm"
        />
        <button
          type="submit"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 md:h-9 md:w-9"
          aria-label="Search"
        >
          <MagnifyingGlassIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {/* Popover. z-[60] beats the sticky header's z-40 so it overlaps the
          page content immediately below the bar without being clipped. */}
      {showPanel && (
        <div
          className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        >
          {hasResults ? (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Product suggestions"
              className="max-h-[60dvh] overflow-y-auto overscroll-contain py-1"
            >
              {results.map((p, i) => {
                const isActive = i === highlight;
                return (
                  <li
                    key={p.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setHighlight(i)}
                  >
                    <Link
                      href={`/products/${p.slug}`}
                      // mousedown (not click) fires before the input's blur
                      // would close the panel and unmount this link.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateTo(`/products/${p.slug}`);
                      }}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        isActive ? 'bg-accent' : 'hover:bg-muted'
                      }`}
                    >
                      <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded bg-muted ring-1 ring-border">
                        {p.featured_image_url ? (
                          <Image
                            src={p.featured_image_url}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-contain p-0.5"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-full w-full items-center justify-center text-xl text-muted-foreground"
                          >
                            📦
                          </span>
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                        {p.name}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                        {formatPrice(p.price)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {/* Always-visible escape hatch to the full results page. Even if
              the top 8 weren't quite right, the user can land on the
              paginated grid. */}
          <Link
            href={`/search?q=${encodeURIComponent(q.trim())}`}
            onMouseDown={(e) => {
              e.preventDefault();
              navigateTo(`/search?q=${encodeURIComponent(q.trim())}`);
            }}
            className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-link-on-light hover:bg-accent ${
              hasResults ? 'border-t border-border' : ''
            }`}
          >
            <span className="truncate">
              See all results for <span className="font-semibold">“{q.trim()}”</span>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      )}
    </div>
  );
}
