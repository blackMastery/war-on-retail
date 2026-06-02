'use server';

import { requirePageAccess } from '@/lib/admin/auth';
import { uploadToBucket, type AdminUploadResult } from '@/lib/admin/storage';

/**
 * Uploads a category illustration to the `category-images` bucket and
 * returns its public URL. Used by the category form's image picker.
 */
export async function uploadCategoryImage(fd: FormData): Promise<AdminUploadResult> {
  await requirePageAccess('categories');
  return uploadToBucket('category-images', fd);
}
