'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

export type NavItem = { label: string; href: string };
export type NavGroup = {
  /** Optional heading. When `href` is also set the heading is clickable. */
  label?: string;
  href?: string;
  items: NavItem[];
};

type Props = {
  label: string;
  /** Flat list (e.g. brand names). */
  items?: NavItem[];
  /** Grouped mega-menu (e.g. parent categories with subcategories beneath). */
  groups?: NavGroup[];
  /** Panel width: `sm` for flat lists, `lg` for the mega menu. */
  width?: 'sm' | 'md' | 'lg';
  /** Render the trigger in bold. */
  highlight?: boolean;
};

const widthClass = {
  sm: 'w-56',
  md: 'w-[22rem]',
  lg: 'w-[min(48rem,calc(100vw-2rem))]',
} as const;

/**
 * A nav dropdown that opens on hover (desktop) AND on click/Enter (keyboard
 * + touch). Closes on:
 *   - Mouse leaving the trigger AND panel for >150 ms
 *   - ESC (returns focus to the trigger)
 *   - Click outside
 *   - Clicking any item in the panel
 *
 * Two shapes:
 *   - `items` → flat list (e.g. brand names)
 *   - `groups` → mega-menu grid (e.g. parent categories with subcategories)
 *
 * Keep the panel a single, sibling-aware unit: `onMouseLeave` on the
 * *container* (not the panel) is what fires the close timer, so moving the
 * cursor between the trigger and panel doesn't accidentally dismiss it.
 */
export default function NavDropdown({
  label,
  items,
  groups,
  width = 'sm',
  highlight = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelId = useId();

  function cancelClose() {
    if (closeTimer.current != null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }
  function scheduleClose(delay = 150) {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), delay);
  }
  function close() {
    cancelClose();
    setOpen(false);
  }

  // ESC closes + restores focus to the trigger.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Click outside closes.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Cancel any pending close on unmount.
  useEffect(() => () => cancelClose(), []);

  const pathname = usePathname();

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={() => scheduleClose()}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex items-center gap-1 hover:text-accent-400 ${
          highlight ? 'font-bold' : ''
        }`}
      >
        {label}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="menu"
          aria-label={label}
          className={`absolute left-0 top-full z-50 mt-1 ${widthClass[width]} max-h-[min(32rem,80vh)] overflow-y-auto rounded-md bg-white text-gray-900 shadow-lg ring-1 ring-gray-200`}
        >
          {groups ? (
            <Groups groups={groups} onSelect={close} pathname={pathname} />
          ) : (
            <Items items={items ?? []} onSelect={close} pathname={pathname} />
          )}
        </div>
      )}
    </div>
  );
}

function Items({
  items,
  onSelect,
  pathname,
}: {
  items: NavItem[];
  onSelect: () => void;
  pathname: string;
}) {
  if (!items.length) {
    return <p className="px-4 py-3 text-sm italic text-gray-500">Nothing here yet.</p>;
  }
  return (
    <ul role="none" className="py-2">
      {items.map((it) => (
        <li key={it.href} role="none">
          <Link
            href={it.href}
            role="menuitem"
            aria-current={pathname === it.href ? 'page' : undefined}
            onClick={onSelect}
            className="block px-4 py-2 text-sm hover:bg-primary-50 hover:text-primary-700 focus-visible:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-600 aria-[current=page]:font-semibold aria-[current=page]:text-primary-700"
          >
            {it.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Groups({
  groups,
  onSelect,
  pathname,
}: {
  groups: NavGroup[];
  onSelect: () => void;
  pathname: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((g, i) => (
        <div key={i}>
          {g.label &&
            (g.href ? (
              <Link
                href={g.href}
                onClick={onSelect}
                role="menuitem"
                aria-current={pathname === g.href ? 'page' : undefined}
                className="mb-2 block text-sm font-bold text-primary-700 hover:underline aria-[current=page]:underline"
              >
                {g.label}
              </Link>
            ) : (
              <p role="heading" aria-level={3} className="mb-2 text-sm font-bold text-gray-900">
                {g.label}
              </p>
            ))}
          <ul role="none" className="space-y-1">
            {g.items.map((it) => (
              <li key={it.href} role="none">
                <Link
                  href={it.href}
                  role="menuitem"
                  aria-current={pathname === it.href ? 'page' : undefined}
                  onClick={onSelect}
                  className="block py-0.5 text-sm text-gray-700 hover:text-primary-600 focus-visible:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 aria-[current=page]:font-semibold aria-[current=page]:text-primary-700"
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
