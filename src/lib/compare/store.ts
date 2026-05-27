'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'wor_compare_v1';

/** Max products that can be compared at once. 4 columns is the practical
 *  limit before the side-by-side table starts truncating on a laptop. */
export const COMPARE_MAX = 4;

type CompareState = {
  slugs: string[];
  _hasHydrated: boolean;

  /** True when the slug is currently selected. */
  has: (slug: string) => boolean;
  /** Add if absent (no-op when at COMPARE_MAX). */
  add: (slug: string) => void;
  /** Remove a single entry. */
  remove: (slug: string) => void;
  /** Toggle membership. Returns:
   *   - true   → just added
   *   - false  → just removed
   *   - 'full' → rejected because already at COMPARE_MAX */
  toggle: (slug: string) => true | false | 'full';
  clear: () => void;

  _setHasHydrated: (v: boolean) => void;
};

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      slugs: [],
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      has: (slug) => get().slugs.includes(slug),
      add: (slug) => {
        const slugs = get().slugs;
        if (slugs.includes(slug)) return;
        if (slugs.length >= COMPARE_MAX) return;
        set({ slugs: [...slugs, slug] });
      },
      remove: (slug) => set({ slugs: get().slugs.filter((s) => s !== slug) }),
      toggle: (slug) => {
        const slugs = get().slugs;
        if (slugs.includes(slug)) {
          set({ slugs: slugs.filter((s) => s !== slug) });
          return false;
        }
        if (slugs.length >= COMPARE_MAX) return 'full';
        set({ slugs: [...slugs, slug] });
        return true;
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

export function selectCompareCount(state: CompareState): number {
  return state.slugs.length;
}

export function useCompareHydrated(): boolean {
  return useCompareStore((s) => s._hasHydrated);
}

/** Builds the deep-link URL to `/compare` from the currently-selected slugs. */
export function buildCompareUrl(slugs: string[]): string {
  if (slugs.length === 0) return '/compare';
  return `/compare?slugs=${encodeURIComponent(slugs.join(','))}`;
}
