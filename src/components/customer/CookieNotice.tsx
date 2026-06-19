'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { XMarkIcon } from '@heroicons/react/24/outline';

const STORAGE_KEY = 'wor_cookie_notice_v1';

/**
 * Bottom-of-page privacy notice. Informational rather than consent-gating —
 * we don't use third-party tracking cookies. All "cookies" on this site are
 * either:
 *   - Supabase Auth session cookies (admin login only, functional)
 *   - localStorage entries that power the cart / wishlist / compare /
 *     recently-viewed features (the user *wants* these)
 *
 * So there's nothing meaningful to decline. The banner exists to be
 * transparent about what's stored and point at the privacy policy.
 *
 * Renders nothing on first paint (until localStorage is read) to avoid an
 * SSR/hydration mismatch and a momentary flash on every page load for
 * returning visitors who've already dismissed.
 *
 * Publishes `--cookie-banner-height` so the chat FAB shifts above this bar.
 */
export default function CookieNotice() {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === 'dismissed');
    } catch {
      // localStorage blocked (private mode, etc.) — show the banner once per session.
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    function clearHeight() {
      root.style.setProperty('--cookie-banner-height', '0px');
    }

    if (!mounted || dismissed) {
      clearHeight();
      return;
    }

    const el = bannerRef.current;
    if (!el) return;

    function syncHeight() {
      root.style.setProperty('--cookie-banner-height', `${el!.offsetHeight}px`);
    }

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => {
      ro.disconnect();
      clearHeight();
    };
  }, [mounted, dismissed]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    } catch {
      // No-op — banner just reappears next visit; not the end of the world.
    }
  }

  if (!mounted || dismissed) return null;

  return (
    <div
      ref={bannerRef}
      role="dialog"
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-body"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex-1">
          <p id="cookie-notice-title" className="text-sm font-semibold text-foreground">
            Cookies &amp; privacy
          </p>
          <p id="cookie-notice-body" className="mt-1 text-xs text-muted-foreground">
            We use browser storage to remember your cart, wishlist, and recently viewed items.
            Our chat assistant logs conversations so we can improve replies. We don't use
            third-party tracking cookies.{' '}
            <Link
              href="/policies/privacy"
              className="font-medium text-link-on-light hover:underline"
            >
              Read our privacy policy →
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss privacy notice"
          className="inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90 sm:w-auto sm:shrink-0"
        >
          <span className="sm:hidden">Got it</span>
          <span className="hidden sm:inline">Dismiss Privacy Notice</span>
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
