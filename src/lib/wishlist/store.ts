'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'wor_wishlist_v1';

type WishlistState = {
  /** Set of product slugs, most-recently-added first. */
  slugs: string[];
  /**
   * When set, the wishlist is backed by `public.wishlist_items` for this user
   * and every mutation is written through to the DB. Null = guest (localStorage
   * only). Not persisted — re-derived from the session on each load.
   */
  authUserId: string | null;
  _hasHydrated: boolean;

  /** True when this slug is currently in the wishlist. */
  has: (slug: string) => boolean;
  /** Add a slug (no-op if already present). Writes through to the DB when authed. */
  add: (slug: string) => void;
  /** Remove a slug. Writes through to the DB when authed. */
  remove: (slug: string) => void;
  /** Add if absent, remove if present. Returns the new presence. */
  toggle: (slug: string) => boolean;
  clear: () => void;

  /**
   * Switch backing store based on the session. Pass a user id to merge the
   * current localStorage slugs into that account and then mirror the DB list;
   * pass null to fall back to guest/localStorage mode.
   */
  setAuthUser: (userId: string | null) => Promise<void>;

  _setHasHydrated: (v: boolean) => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      slugs: [],
      authUserId: null,
      _hasHydrated: false,
      _setHasHydrated: (v) => set({ _hasHydrated: v }),

      has: (slug) => get().slugs.includes(slug),

      add: (slug) => {
        if (!slug || get().has(slug)) return;
        set({ slugs: [slug, ...get().slugs] });
        const uid = get().authUserId;
        if (uid) {
          createClient()
            .from('wishlist_items')
            .insert({ user_id: uid, product_slug: slug })
            .then(({ error }) => {
              if (error) console.error('[wishlist] insert failed', error);
            });
        }
      },

      remove: (slug) => {
        set({ slugs: get().slugs.filter((s) => s !== slug) });
        const uid = get().authUserId;
        if (uid) {
          createClient()
            .from('wishlist_items')
            .delete()
            .eq('user_id', uid)
            .eq('product_slug', slug)
            .then(({ error }) => {
              if (error) console.error('[wishlist] delete failed', error);
            });
        }
      },

      toggle: (slug) => {
        const had = get().has(slug);
        if (had) get().remove(slug);
        else get().add(slug);
        return !had;
      },

      clear: () => {
        set({ slugs: [] });
        const uid = get().authUserId;
        if (uid) {
          createClient()
            .from('wishlist_items')
            .delete()
            .eq('user_id', uid)
            .then(({ error }) => {
              if (error) console.error('[wishlist] clear failed', error);
            });
        }
      },

      setAuthUser: async (userId) => {
        // Guest mode — keep whatever is in localStorage, just drop the link.
        if (!userId) {
          set({ authUserId: null });
          return;
        }
        const supabase = createClient();
        // Merge any items added as a guest into the account, then mirror the
        // canonical DB list back into the store.
        const local = get().slugs;
        if (local.length > 0) {
          const { error } = await supabase.rpc('merge_wishlist', { p_slugs: local });
          if (error) console.error('[wishlist] merge failed', error);
        }
        const { data, error } = await supabase
          .from('wishlist_items')
          .select('product_slug')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        if (error) {
          console.error('[wishlist] load failed', error);
          set({ authUserId: userId });
          return;
        }
        set({ authUserId: userId, slugs: (data ?? []).map((r) => r.product_slug) });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only the slugs persist — authUserId is session-derived each load.
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
