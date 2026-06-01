import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { siteConfig } from '@/config/site';
import type { StoreSettings } from '@/types/database';

/**
 * Resolved store settings — DB row when present, env-defaulted siteConfig
 * fallbacks otherwise. Used by the customer chrome (Header, Footer), the
 * checkout map, SEO metadata, etc.
 *
 * The shape mirrors the DB row's nullable-vs-non-nullable choices, plus a
 * derived `mapsEmbedUrl` so callers don't have to assemble it.
 */
export type ResolvedStoreSettings = {
  name: string;
  description: string;
  url: string;
  email: string;
  phone: string;
  /** Digits only, no leading `+`. Plug into `https://wa.me/{whatsapp}`. */
  whatsapp: string;
  adminEmail: string;
  address: string;
  /** Latitude (decimal degrees) or null when the admin hasn't set it. */
  latitude: number | null;
  longitude: number | null;
  hours: { weekdays: string; saturday: string; sunday: string };
  social: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
  };
  /**
   * Google Maps embed URL. Prefers lat/lng (a precise pin) and falls back to
   * a freeform address query. Always built — callers just drop it into an
   * `<iframe src>`.
   */
  mapsEmbedUrl: string;
};

/** Tag used to invalidate any tagged route-segment caches that read settings. */
export const STORE_SETTINGS_CACHE_TAG = 'store-settings';

function buildMapsEmbedUrl(
  lat: number | null,
  lng: number | null,
  address: string,
): string {
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}&output=embed`;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

/**
 * Loads the singleton settings row and overlays the env-derived `siteConfig`
 * as fallbacks for anything the row leaves blank.
 *
 * Wrapped in React's `cache` — within a single request the layout, the page,
 * and `generateMetadata` can all call this and share one Supabase round-trip.
 * For cross-request caching we lean on Next's route-segment cache via the
 * `revalidate` set on each page/layout (e.g. the customer layout's 120 s).
 *
 * `unstable_cache` is NOT used here because the Supabase server client reads
 * cookies (for auth refresh), and `unstable_cache` forbids cookie access.
 */
export const getStoreSettings = cache(async (): Promise<ResolvedStoreSettings> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 'default')
    .maybeSingle<StoreSettings>();

  const address = data?.address ?? siteConfig.address;
  const lat = data?.latitude ?? null;
  const lng = data?.longitude ?? null;

  return {
    name: data?.name ?? siteConfig.name,
    description: data?.description ?? siteConfig.description,
    url: data?.url ?? siteConfig.url,
    email: data?.email ?? siteConfig.email,
    phone: data?.phone ?? siteConfig.phone,
    whatsapp: data?.whatsapp ?? siteConfig.whatsapp,
    adminEmail: data?.admin_email ?? siteConfig.email,
    address,
    latitude: lat,
    longitude: lng,
    hours: {
      weekdays: data?.hours_weekdays ?? siteConfig.hours.weekdays,
      saturday: data?.hours_saturday ?? siteConfig.hours.saturday,
      sunday: data?.hours_sunday ?? siteConfig.hours.sunday,
    },
    social: {
      facebook: data?.facebook_url ?? siteConfig.social.facebook,
      instagram: data?.instagram_url ?? siteConfig.social.instagram,
      twitter: data?.twitter_url ?? siteConfig.social.twitter,
    },
    mapsEmbedUrl: buildMapsEmbedUrl(lat, lng, address),
  };
});
