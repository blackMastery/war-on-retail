'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/cart/store';

/**
 * Tiny client child rendered inside the order-success server page. The
 * wizard already calls `clear()` before navigating, but this catches the
 * edge cases — direct link, refresh after success — so the user never sees
 * a "completed" cart still hanging around.
 */
export default function ClearCartOnMount() {
  useEffect(() => {
    useCartStore.getState().clear();
  }, []);
  return null;
}
