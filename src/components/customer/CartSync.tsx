'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCartHydrated, useCartStore } from '@/lib/cart/store';

/**
 * Bridges the Supabase session to the cart store: once localStorage has
 * hydrated, it points the store at the signed-in user's DB-backed cart
 * (merging any guest items on the way) or back to guest mode on sign-out.
 *
 * Mounted once in the customer layout. Renders nothing.
 */
export default function CartSync() {
  const hydrated = useCartHydrated();
  const setAuthUser = useCartStore((s) => s.setAuthUser);

  useEffect(() => {
    if (!hydrated) return;

    const supabase = createClient();
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) void setAuthUser(data.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        void setAuthUser(session?.user?.id ?? null, true);
      } else if (event === 'SIGNED_OUT') {
        void setAuthUser(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [hydrated, setAuthUser]);

  return null;
}
