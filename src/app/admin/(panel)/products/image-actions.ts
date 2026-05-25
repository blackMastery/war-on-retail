'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';

const BUCKET = 'product-images';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — matches next.config.mjs bodySizeLimit
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

export type ImageUploadResult = { url: string } | { error: string };

/**
 * Uploads a single image to Supabase Storage and returns its public URL.
 *
 * The client calls this once per selected file so we can show per-image
 * progress and never blow past the server-action body-size limit.
 */
export async function uploadProductImage(fd: FormData): Promise<ImageUploadResult> {
  await requireAdmin();

  const file = fd.get('file');
  if (!(file instanceof File)) {
    return { error: 'No file received.' };
  }
  if (file.size === 0) {
    return { error: 'Empty file.' };
  }
  if (file.size > MAX_BYTES) {
    return { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB — max 5 MB).` };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: `Unsupported type ${file.type}. Use JPG, PNG, WebP, AVIF, or GIF.` };
  }

  // Build a key that won't collide and preserves the original extension for the CDN.
  const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || file.type.split('/')[1] || 'bin').toLowerCase();
  const safeStem = file.name
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
  const { error } = await supabase.storage.from(BUCKET).upload(key, file, {
    contentType: file.type,
    cacheControl: '31536000, immutable',
    upsert: false,
  });
  if (error) {
    return {
      error:
        error.message.includes('Bucket not found') || error.message.includes('does not exist')
          ? `The "${BUCKET}" storage bucket doesn't exist yet. Create it (public) in the Supabase dashboard, then retry.`
          : error.message,
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  return { url: data.publicUrl };
}
