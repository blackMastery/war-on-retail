'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'wor_recently_viewed_v1';
const MAX_SLUGS = 10;

type RecentlyViewedState = {
  /** Most-recent first. Bounded to MAX_SLUGS, dedupes on add. */
  slugs: string[];
  /** Flips true once persist has finished reading from localStorage. */
  _hasHydrated: boolean;

  /** Push a slug to the front. If already present, it gets moved to the front
   *  (so re-viewing keeps it fresh in the list). */
  push: (slug: string) => void;
  /** Manual remove — used by the strip's "x" if we add one later. */
  remove: (slug: string) => void;
  clear: () => void;

  _setHasHydrated: (v: boolean) => void;
};

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      slugs: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      push: (slug) => {
        if (!slug) return;
        // Move-to-front: drop any existing occurrence, prepend, then cap.
        const without = get().slugs.filter((s) => s !== slug);
        set({ slugs: [slug, ...without].slice(0, MAX_SLUGS) });
      },
      remove: (slug) => set({ slugs: get().slugs.filter((s) => s !== slug) }),
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

/** True once the persisted state has loaded. */
export function useRecentlyViewedHydrated(): boolean {
  return useRecentlyViewedStore((s) => s._hasHydrated);
}
