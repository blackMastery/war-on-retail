'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';

/**
 * One Zod schema for the whole settings form. Optional URL fields accept
 * empty strings (treated as null) so the admin can clear a social link
 * without typing `null` literally.
 */
const StoreSettingsInput = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  url: z.string().url('Must be a full URL (https://…)'),

  email: z.string().email('Must be a valid email'),
  phone: z.string().min(4, 'Phone is required'),
  whatsapp: z
    .string()
    .regex(/^\d{7,15}$/, 'WhatsApp must be digits only — country code + number, no `+`'),
  admin_email: z.string().email('Must be a valid email'),

  address: z.string().min(1, 'Address is required'),
  latitude: z.coerce
    .number()
    .min(-90, 'Latitude out of range')
    .max(90, 'Latitude out of range')
    .nullable()
    .or(z.literal('').transform(() => null)),
  longitude: z.coerce
    .number()
    .min(-180, 'Longitude out of range')
    .max(180, 'Longitude out of range')
    .nullable()
    .or(z.literal('').transform(() => null)),

  hours_weekdays: z.string().min(1),
  hours_saturday: z.string().min(1),
  hours_sunday: z.string().min(1),

  facebook_url: z.string().url().optional().nullable().or(z.literal('')),
  instagram_url: z.string().url().optional().nullable().or(z.literal('')),
  twitter_url: z.string().url().optional().nullable().or(z.literal('')),
});

export type StoreSettingsFormState = {
  error?: string;
  saved?: boolean;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const obj: Record<string, string | null> = Object.fromEntries(
    Array.from(fd.entries()).map(([k, v]) => [k, typeof v === 'string' ? v : '']),
  );
  // Lat/lng inputs are `type="number"` but unset comes through as ''. The Zod
  // chain handles '' → null, but we also need to handle the case where the
  // browser sends nothing.
  if (obj.latitude === '') obj.latitude = null;
  if (obj.longitude === '') obj.longitude = null;
  return obj;
}

export async function updateStoreSettings(
  _prev: StoreSettingsFormState,
  fd: FormData,
): Promise<StoreSettingsFormState> {
  await requirePageAccess('settings');

  const parsed = StoreSettingsInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const payload = {
    name: input.name.trim(),
    description: input.description.trim(),
    url: input.url.trim().replace(/\/+$/, ''),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    whatsapp: input.whatsapp.trim(),
    admin_email: input.admin_email.trim().toLowerCase(),
    address: input.address.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    hours_weekdays: input.hours_weekdays.trim(),
    hours_saturday: input.hours_saturday.trim(),
    hours_sunday: input.hours_sunday.trim(),
    facebook_url: input.facebook_url && input.facebook_url !== '' ? input.facebook_url : null,
    instagram_url: input.instagram_url && input.instagram_url !== '' ? input.instagram_url : null,
    twitter_url: input.twitter_url && input.twitter_url !== '' ? input.twitter_url : null,
  };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('store_settings')
    .update(payload)
    .eq('id', 'default');
  if (error) return { error: error.message };

  // Bust the route-segment cache for everything under the root layout so the
  // Header / Footer / Checkout / SEO metadata pick up the new values on the
  // next navigation. The store-settings helper itself is React.cache-wrapped
  // (request-scoped), so no extra tag invalidation is needed.
  revalidatePath('/', 'layout');
  revalidatePath('/admin/settings');

  return { saved: true };
}
