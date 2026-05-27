'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from './types';

const STORAGE_KEY = 'wor_cart_v1';

type CartState = {
  items: CartItem[];
  /** Flips to true once the persisted state has been read from localStorage.
   *  Components guard count/total rendering on this to avoid an SSR/client
   *  hydration mismatch (server-rendered "0", then client snaps to "3"). */
  _hasHydrated: boolean;

  /** Add one (or `qty`) of an item. Increments quantity if already in cart. */
  addItem: (input: Omit<CartItem, 'quantity'>, qty?: number) => void;
  /** Remove a line entirely. */
  removeItem: (productId: string) => void;
  /** Set absolute qty. Setting to 0 (or below) removes the line. */
  setQuantity: (productId: string, qty: number) => void;
  /** Empty the cart. */
  clear: () => void;

  /** Internal — toggled by the persist middleware's onRehydrateStorage. */
  _setHasHydrated: (v: boolean) => void;
};

/**
 * localStorage-persisted cart store.
 *
 * Versioning: the storage key includes `_v1`. Bump to `_v2` (and write a
 * migrate function in the persist config) if the CartItem shape ever changes
 * in a breaking way.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      addItem: (input, qty = 1) => {
        if (qty <= 0) return;
        const items = get().items;
        const existing = items.find((i) => i.productId === input.productId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === input.productId ? { ...i, quantity: i.quantity + qty } : i,
            ),
          });
        } else {
          set({ items: [...items, { ...input, quantity: qty }] });
        }
      },
      removeItem: (productId) =>
        set({ items: get().items.filter((i) => i.productId !== productId) }),
      setQuantity: (productId, qty) => {
        const items = get().items;
        if (qty <= 0) {
          set({ items: items.filter((i) => i.productId !== productId) });
          return;
        }
        set({
          items: items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
        });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the items survive across reloads; hydration state is per-mount.
      partialize: (state) => ({ items: state.items }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

// ---------- selectors / helpers ----------

/** Total item count across all lines — used by the header badge. */
export function selectItemCount(state: CartState): number {
  return state.items.reduce((sum, i) => sum + i.quantity, 0);
}

/** Cart subtotal in GYD. */
export function selectSubtotal(state: CartState): number {
  return state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

/** True once `persist` has finished reading localStorage on the client. */
export function useCartHydrated(): boolean {
  return useCartStore((s) => s._hasHydrated);
}
