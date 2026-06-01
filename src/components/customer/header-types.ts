/**
 * Narrow slice of the store settings that the Header (a client component)
 * actually reads. Splitting this into its own module — instead of pulling
 * `ResolvedStoreSettings` from `@/lib/store-settings` — keeps the `'server-only'`
 * marker on that file from leaking into the client bundle through type imports.
 */
export type HeaderSettings = {
  name: string;
  phone: string;
  whatsapp: string;
  hoursWeekdays: string;
};
