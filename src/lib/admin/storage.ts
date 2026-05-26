import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches next.config.mjs bodySizeLimit
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export type AdminUploadResult = { url: string } | { error: string };

/**
 * Shared image-upload helper used by every admin image picker (product
 * gallery, promotions, brand logos, category images).
 *
 * The bucket is supplied by the *server-side caller* (a `'use server'`
 * wrapper for that specific feature), never by the browser — that's the
 * security boundary. Without it, a malicious client could upload to any
 * bucket the service role can write to.
 *
 * Path: `<bucket>/YYYY-MM-DD/<uuid>-<slugified-name>.<ext>` — date prefix
 * keeps the bucket browsable, the UUID guarantees uniqueness, and the
 * slugified name preserves human-readable context for debugging.
 */
export async function uploadToBucket(
  bucket: string,
  fd: FormData,
): Promise<AdminUploadResult> {
  const file = fd.get('file');
  if (!(file instanceof File)) return { error: 'No file received.' };
  if (file.size === 0) return { error: 'Empty file.' };
  if (file.size > MAX_BYTES) {
    return {
      error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB — max 5 MB).`,
    };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      error: `Unsupported type ${file.type}. Use JPG, PNG, WebP, AVIF, or GIF.`,
    };
  }

  const ext = (
    file.name.match(/\.([a-z0-9]+)$/i)?.[1] ||
    file.type.split('/')[1] ||
    'bin'
  ).toLowerCase();
  const safeStem =
    file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
  const uniq =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  const key = `${new Date().toISOString().slice(0, 10)}/${uniq}-${safeStem}.${ext}`;

  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(bucket).upload(key, file, {
    contentType: file.type,
    cacheControl: '31536000, immutable',
    upsert: false,
  });
  if (error) {
    return {
      error:
        error.message.includes('Bucket not found') ||
        error.message.includes('does not exist')
          ? `The "${bucket}" storage bucket doesn't exist yet. Create it (public) in the Supabase dashboard, then retry.`
          : error.message,
    };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(key);
  return { url: data.publicUrl };
}
