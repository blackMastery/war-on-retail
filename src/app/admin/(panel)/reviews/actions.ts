'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import type { ReviewStatus } from '@/types/database';

async function readReview(id: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('product_reviews')
    .select('id, status, product_id')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error('Review not found');

  const { data: product } = await supabase
    .from('products')
    .select('slug')
    .eq('id', data.product_id)
    .maybeSingle();

  return { ...data, productSlug: product?.slug ?? null };
}

function bumpRevalidate(productSlug: string | null | undefined) {
  revalidatePath('/admin/reviews');
  if (productSlug) {
    revalidatePath(`/products/${productSlug}`);
  }
  revalidatePath('/products');
}

async function setReviewStatus(id: string, status: ReviewStatus) {
  const { user } = await requirePageAccess('reviews');
  const review = await readReview(id);
  if (review.status === status) return;

  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('product_reviews')
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  bumpRevalidate(review.productSlug);
}

export async function approveReviewAction(id: string) {
  await setReviewStatus(id, 'approved');
}

export async function rejectReviewAction(id: string) {
  await setReviewStatus(id, 'rejected');
}
