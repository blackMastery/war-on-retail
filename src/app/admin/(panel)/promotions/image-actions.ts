'use server';

import { requireAdmin } from '@/lib/admin/auth';
import { uploadToBucket, type AdminUploadResult } from '@/lib/admin/storage';

export type PromotionImageUploadResult = AdminUploadResult;

/**
 * Uploads a single promotion image to the `promotions` Storage bucket and
 * returns its public URL. Used by the promotion form's image picker.
 */
export async function uploadPromotionImage(
  fd: FormData,
): Promise<PromotionImageUploadResult> {
  await requireAdmin();
  return uploadToBucket('promotions', fd);
}
