'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { uploadToBucket, type AdminUploadResult } from '@/lib/admin/storage';

/**
 * Uploads a brand logo to the `brand-logos` Storage bucket and returns its
 * public URL. Used by the brand form's logo picker.
 */
export async function uploadBrandLogo(fd: FormData): Promise<AdminUploadResult> {
  await requireAdmin();
  return uploadToBucket('brand-logos', fd);
}
