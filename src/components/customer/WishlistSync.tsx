'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useWishlistHydrated, useWishlistStore } from '@/lib/wishlist/store';

/**
 * Bridges the Supabase session to the wishlist store: once localStorage has
 * hydrated, it points the store at the signed-in user's DB-backed wishlist
 * (merging any guest items on the way) or back to guest mode on sign-out.
 *
 * Mounted once in the customer layout. Renders nothing.
 */
export default function WishlistSync() {
  const hydrated = useWishlistHydrated();
  const setAuthUser = useWishlistStore((s) => s.setAuthUser);

  useEffect(() => {
    // Wait for localStorage to load so guest items aren't lost before merge.
    if (!hydrated) return;

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) void setAuthUser(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void setAuthUser(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrated, setAuthUser]);

  return null;
}
