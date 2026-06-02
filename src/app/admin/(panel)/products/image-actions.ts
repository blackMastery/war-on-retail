'use server';

import { requirePageAccess } from '@/lib/admin/auth';
import { uploadToBucket, type AdminUploadResult } from '@/lib/admin/storage';

export type ImageUploadResult = AdminUploadResult;

/**
 * Uploads a single image to the `product-images` bucket and returns its
 * public URL. Used by the product form's gallery picker.
 */
export async function uploadProductImage(fd: FormData): Promise<ImageUploadResult> {
  await requirePageAccess('products');
  return uploadToBucket('product-images', fd);
}
