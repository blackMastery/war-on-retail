'use client';

import { useEffect, useState } from 'react';
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
 */
export default function CookieNotice() {
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
      role="dialog"
      aria-labelledby="cookie-notice-title"
      aria-describedby="cookie-notice-body"
      // High z so it sits above the chatbot button (z-50) and any other floating UI.
      className="fixed bottom-0 left-0 right-0 z-[60] border-t border-gray-200 bg-white shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex-1">
          <p id="cookie-notice-title" className="text-sm font-semibold text-gray-900">
            Cookies &amp; privacy
          </p>
          <p id="cookie-notice-body" className="mt-1 text-xs text-gray-600">
            We use browser storage to remember your cart, wishlist, and recently viewed items.
            Our chat assistant logs conversations so we can improve replies. We don't use
            third-party tracking cookies.{' '}
            <Link
              href="/policies/privacy"
              className="font-medium text-primary-600 hover:underline"
            >
              Read our privacy policy →
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex items-center justify-center gap-1 rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white hover:bg-primary-700 sm:shrink-0"
        >
          Got it
          <XMarkIcon className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
