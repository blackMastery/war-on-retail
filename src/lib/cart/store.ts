'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartItem } from './types';
import type { AppliedDiscount } from '@/types/discount';

// Bumped v1 → v2 when the applied-discount slice was added.
const STORAGE_KEY = 'wor_cart_v2';

type CartState = {
  items: CartItem[];
  /** The discount the customer applied in the cart, if any. Persisted so it
   *  survives the cart → checkout navigation. Re-validated authoritatively by
   *  the place_order RPC at submit time. Cleared whenever the cart contents
   *  change, since the saved amount would otherwise go stale. */
  appliedDiscount: AppliedDiscount | null;
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

  /** Record a validated discount (from /api/discounts/validate). */
  setDiscount: (discount: AppliedDiscount) => void;
  /** Remove the applied discount. */
  clearDiscount: () => void;

  /** Internal — toggled by the persist middleware's onRehydrateStorage. */
  _setHasHydrated: (v: boolean) => void;
};

/**
 * localStorage-persisted cart store.
 *
 * Versioning: the storage key includes `_v2`. Bump again (and extend the
 * `migrate` function) if the persisted shape ever changes in a breaking way.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      appliedDiscount: null,
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
            appliedDiscount: null,
          });
        } else {
          set({ items: [...items, { ...input, quantity: qty }], appliedDiscount: null });
        }
      },
      removeItem: (productId) =>
        set({
          items: get().items.filter((i) => i.productId !== productId),
          appliedDiscount: null,
        }),
      setQuantity: (productId, qty) => {
        const items = get().items;
        if (qty <= 0) {
          set({ items: items.filter((i) => i.productId !== productId), appliedDiscount: null });
          return;
        }
        set({
          items: items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i)),
          appliedDiscount: null,
        });
      },
      clear: () => set({ items: [], appliedDiscount: null }),

      setDiscount: (discount) => set({ appliedDiscount: discount }),
      clearDiscount: () => set({ appliedDiscount: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Persist the cart items + the applied discount; hydration state is
      // per-mount and never written.
      partialize: (state) => ({
        items: state.items,
        appliedDiscount: state.appliedDiscount,
      }),
      // v1 had no appliedDiscount slice — default it on upgrade.
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Partial<CartState>;
        return {
          items: p.items ?? [],
          appliedDiscount: p.appliedDiscount ?? null,
        } as CartState;
      },
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

/** GYD taken off by the applied discount (0 when none). */
export function selectDiscountAmount(state: CartState): number {
  return state.appliedDiscount?.amountDiscounted ?? 0;
}

/** Payable total = subtotal − discount, never below 0. */
export function selectTotal(state: CartState): number {
  return Math.max(0, selectSubtotal(state) - selectDiscountAmount(state));
}

/** True once `persist` has finished reading localStorage on the client. */
export function useCartHydrated(): boolean {
  return useCartStore((s) => s._hasHydrated);
}
