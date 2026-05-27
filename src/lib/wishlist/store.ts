'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'wor_wishlist_v1';

type WishlistState = {
  /** Set of product slugs, most-recently-added first. */
  slugs: string[];
  _hasHydrated: boolean;

  /** True when this slug is currently in the wishlist. */
  has: (slug: string) => boolean;
  /** Add a slug (no-op if already present). */
  add: (slug: string) => void;
  /** Remove a slug. */
  remove: (slug: string) => void;
  /** Add if absent, remove if present. Returns the new presence. */
  toggle: (slug: string) => boolean;
  clear: () => void;

  _setHasHydrated: (v: boolean) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      has: (slug) => get().slugs.includes(slug),
      add: (slug) => {
        if (!slug || get().has(slug)) return;
        set({ slugs: [slug, ...get().slugs] });
      },
      remove: (slug) => set({ slugs: get().slugs.filter((s) => s !== slug) }),
      toggle: (slug) => {
        const had = get().has(slug);
        if (had) set({ slugs: get().slugs.filter((s) => s !== slug) });
        else set({ slugs: [slug, ...get().slugs] });
        return !had;
      },
      clear: () => set({ slugs: [] }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ slugs: state.slugs }),
      onRehydrateStorage: () => (state) => {
        state?._setHasHydrated(true);
      },
    },
  ),
);

export function selectWishlistCount(state: WishlistState): number {
  return state.slugs.length;
}

export function useWishlistHydrated(): boolean {
  return useWishlistStore((s) => s._hasHydrated);
}
