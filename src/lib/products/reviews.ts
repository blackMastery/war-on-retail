import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ProductReviewRow, ReviewStatus } from '@/types/database';
import type { ProductReviewDisplay } from '@/components/customer/ProductReviewCard';
import type { ExistingReview } from '@/components/customer/ProductReviewForm';

type Client = SupabaseClient<Database>;

export type ProductReviewSummary = {
  reviews: ProductReviewDisplay[];
  averageRating: number;
  reviewCount: number;
};

/** Approved reviews for the product detail page, newest first. */
export async function fetchApprovedProductReviews(
  supabase: Client,
  productId: string,
  limit = 20,
): Promise<ProductReviewSummary> {
  const { data } = await supabase
    .from('product_reviews')
    .select('id, rating, body, reviewer_name, created_at')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = data ?? [];
  const reviewCount = rows.length;
  const averageRating =
    reviewCount > 0
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / reviewCount) * 10) / 10
      : 0;

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      created_at: r.created_at,
      reviewer_name: r.reviewer_name,
    })),
    averageRating,
    reviewCount,
  };
}

export type ReviewEligibility = {
  canReview: boolean;
  existingReview: ExistingReview | null;
};

/**
 * Whether the signed-in user may submit a review and their existing row (any status).
 * Requires authenticated session — pass null userId when guest.
 */
export async function fetchReviewEligibility(
  supabase: Client,
  productId: string,
  userId: string | null,
): Promise<ReviewEligibility> {
  if (!userId) {
    return { canReview: false, existingReview: null };
  }

  const [{ data: purchased }, { data: ownReview }] = await Promise.all([
    supabase.rpc('user_purchased_product', { p_product_id: productId }),
    supabase
      .from('product_reviews')
      .select('rating, body, status')
      .eq('product_id', productId)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const existingReview: ExistingReview | null = ownReview
    ? {
        rating: ownReview.rating,
        body: ownReview.body,
        status: ownReview.status as ReviewStatus,
      }
    : null;

  const canReview = Boolean(purchased);

  return { canReview, existingReview };
}

/** Map of product_id → review status for the signed-in user's orders page. */
export async function fetchReviewStatusByProductIds(
  supabase: Client,
  userId: string,
  productIds: string[],
): Promise<Map<string, ReviewStatus>> {
  const map = new Map<string, ReviewStatus>();
  if (productIds.length === 0) return map;

  const { data } = await supabase
    .from('product_reviews')
    .select('product_id, status')
    .eq('user_id', userId)
    .in('product_id', productIds);

  for (const row of data ?? []) {
    map.set(row.product_id, row.status as ReviewStatus);
  }
  return map;
}

export type { ProductReviewRow };
