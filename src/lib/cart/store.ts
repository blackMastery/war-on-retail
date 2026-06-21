'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';
import { hydrateCartItems } from './hydrate';
import type { CartItem } from './types';
import type { AppliedDiscount } from '@/types/discount';

const STORAGE_KEY = 'wor_cart_v2';

type CartState = {
  items: CartItem[];
  /**
   * When set, the cart is backed by `public.cart_items` for this user and
   * every mutation is written through to the DB. Null = guest (localStorage
   * only). Not persisted — re-derived from the session on each load.
   */
  authUserId: string | null;
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

  /**
   * Switch backing store based on the session. Pass a user id to load the
   * account cart from the DB; pass `mergeGuest: true` when the customer just
   * signed in so any guest localStorage lines are folded in first.
   */
  setAuthUser: (userId: string | null, mergeGuest?: boolean) => Promise<void>;

  /** Internal — toggled by the persist middleware's onRehydrateStorage. */
  _setHasHydrated: (v: boolean) => void;
};

const CART_PRODUCT_SELECT =
  'id, slug, name, price, featured_image_url, sku, track_inventory, stock_quantity, is_pre_order_enabled';

async function loadCartFromDb(userId: string): Promise<CartItem[]> {
  const supabase = createClient();
  const { data: rows, error } = await supabase
    .from('cart_items')
    .select('product_id, quantity')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) {
    console.error('[cart] load failed', error);
    return [];
  }
  if (!rows?.length) return [];

  const productIds = rows.map((r) => r.product_id);
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select(CART_PRODUCT_SELECT)
    .eq('is_active', true)
    .in('id', productIds);
  if (prodError) {
    console.error('[cart] products load failed', prodError);
    return [];
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  const hydrationRows = rows.flatMap((row) => {
    const product = byId.get(row.product_id);
    if (!product) return [];
    return [{ quantity: row.quantity, products: product }];
  });
  return hydrateCartItems(hydrationRows);
}

function syncLineToDb(userId: string, productId: string, quantity: number) {
  const supabase = createClient();
  if (quantity <= 0) {
    supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId)
      .then(({ error }) => {
        if (error) console.error('[cart] delete failed', error);
      });
    return;
  }
  supabase
    .from('cart_items')
    .upsert(
      { user_id: userId, product_id: productId, quantity, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,product_id' },
    )
    .then(({ error }) => {
      if (error) console.error('[cart] upsert failed', error);
    });
}

/**
 * localStorage-persisted cart store. Signed-in customers also mirror to
 * `public.cart_items` via write-through mutations and `setAuthUser`.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      authUserId: null,
      appliedDiscount: null,
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      addItem: (input, qty = 1) => {
        if (qty <= 0) return;
        const items = get().items;
        const existing = items.find((i) => i.productId === input.productId);
        let nextItems: CartItem[];
        if (existing) {
          nextItems = items.map((i) =>
            i.productId === input.productId ? { ...i, quantity: i.quantity + qty } : i,
          );
        } else {
          nextItems = [...items, { ...input, quantity: qty }];
        }
        set({ items: nextItems, appliedDiscount: null });
        const uid = get().authUserId;
        if (uid) {
          const line = nextItems.find((i) => i.productId === input.productId);
          if (line) syncLineToDb(uid, line.productId, line.quantity);
        }
      },

      removeItem: (productId) => {
        set({
          items: get().items.filter((i) => i.productId !== productId),
          appliedDiscount: null,
        });
        const uid = get().authUserId;
        if (uid) syncLineToDb(uid, productId, 0);
      },

      setQuantity: (productId, qty) => {
        const items = get().items;
        let nextItems: CartItem[];
        if (qty <= 0) {
          nextItems = items.filter((i) => i.productId !== productId);
        } else {
          nextItems = items.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i));
        }
        set({ items: nextItems, appliedDiscount: null });
        const uid = get().authUserId;
        if (uid) syncLineToDb(uid, productId, qty);
      },

      clear: () => {
        set({ items: [], appliedDiscount: null });
        const uid = get().authUserId;
        if (uid) {
          createClient()
            .from('cart_items')
            .delete()
            .eq('user_id', uid)
            .then(({ error }) => {
              if (error) console.error('[cart] clear failed', error);
            });
        }
      },

      setDiscount: (discount) => set({ appliedDiscount: discount }),
      clearDiscount: () => set({ appliedDiscount: null }),

      setAuthUser: async (userId, mergeGuest = false) => {
        if (!userId) {
          set({ authUserId: null });
          return;
        }
        if (get().authUserId === userId) return;

        const supabase = createClient();
        if (mergeGuest) {
          const local = get().items;
          if (local.length > 0) {
            const { error } = await supabase.rpc('merge_cart', {
              p_items: local.map((i) => ({ product_id: i.productId, quantity: i.quantity })),
            });
            if (error) console.error('[cart] merge failed', error);
          }
        }
        const items = await loadCartFromDb(userId);
        set({ authUserId: userId, items, appliedDiscount: null });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      partialize: (state) => ({
        // Signed-in carts live in the DB; persisting items here would re-merge
        // stale localStorage lines into the account on every page load.
        items: state.authUserId ? [] : state.items,
        appliedDiscount: state.authUserId ? null : state.appliedDiscount,
      }),
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
