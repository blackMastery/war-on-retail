'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';
import StarRating from './StarRating';
import type { ReviewStatus } from '@/types/database';

type Feedback = { kind: 'ok' | 'error'; msg: string } | null;

export type ExistingReview = {
  rating: number;
  body: string;
  status: ReviewStatus;
};

export default function ProductReviewForm({
  productId,
  productSlug,
  isAuthed,
  canReview,
  existingReview,
}: {
  productId: string;
  productSlug: string;
  isAuthed: boolean;
  canReview: boolean;
  existingReview: ExistingReview | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating ?? 0);
  const [body, setBody] = useState(existingReview?.body ?? '');
  const [status, setStatus] = useState<'idle' | 'pending'>('idle');
  const [feedback, setFeedback] = useState<Feedback>(null);

  if (!isAuthed) {
    return (
      <div className="rounded-lg bg-card p-5 text-sm ring-1 ring-border">
        <p className="font-medium text-foreground">Sign in to write a review</p>
        <p className="mt-1 text-secondary-foreground">
          Only customers who purchased this product on a fulfilled order can leave a review.
        </p>
        <Link
          href={`/account/login?next=/products/${productSlug}#reviews`}
          className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!canReview && !existingReview) {
    return (
      <div className="rounded-lg bg-card p-5 text-sm ring-1 ring-border">
        <p className="font-medium text-foreground">Verified purchase required</p>
        <p className="mt-1 text-secondary-foreground">
          You can review this product after your order has been fulfilled.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (rating < 1 || rating > 5) {
      setFeedback({ kind: 'error', msg: 'Please select a star rating.' });
      return;
    }

    const trimmed = body.trim();
    if (trimmed.length < 10) {
      setFeedback({ kind: 'error', msg: 'Your review must be at least 10 characters.' });
      return;
    }
    if (trimmed.length > 2000) {
      setFeedback({ kind: 'error', msg: 'Your review must be at most 2000 characters.' });
      return;
    }

    setStatus('pending');
    const supabase = createClient();
    const { error } = await supabase.rpc('submit_product_review', {
      p_product_id: productId,
      p_rating: rating,
      p_body: trimmed,
    });

    setStatus('idle');
    if (error) {
      const msg = error.message ?? 'Could not submit review.';
      if (msg.includes('NOT_PURCHASED')) {
        setFeedback({
          kind: 'error',
          msg: 'You can only review products from fulfilled orders.',
        });
      } else if (msg.includes('BAD_BODY')) {
        setFeedback({ kind: 'error', msg: 'Please check your review length and try again.' });
      } else {
        setFeedback({ kind: 'error', msg });
      }
      return;
    }

    setFeedback({
      kind: 'ok',
      msg: existingReview
        ? 'Review updated and sent for moderation.'
        : 'Thank you! Your review has been submitted and is pending approval.',
    });
    router.refresh();
  }

  const statusNote =
    existingReview?.status === 'pending'
      ? 'Your review is awaiting approval.'
      : existingReview?.status === 'approved'
        ? 'Your review is published. Edits will require re-approval.'
        : existingReview?.status === 'rejected'
          ? 'Your previous review was not approved. You can submit a revised review.'
          : null;

  return (
    <form onSubmit={onSubmit} className="rounded-lg bg-card p-5 ring-1 ring-border">
      <h3 className="font-semibold text-foreground">
        {existingReview ? 'Edit your review' : 'Write a review'}
      </h3>
      {statusNote && (
        <p className="mt-1 text-sm text-muted-foreground">{statusNote}</p>
      )}

      <div className="mt-4">
        <label className="block text-sm font-medium text-foreground">Rating</label>
        <div className="mt-1">
          <StarRating rating={rating} onChange={setRating} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="review-body" className="block text-sm font-medium text-foreground">
          Review
        </label>
        <textarea
          id="review-body"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
          placeholder="Share your experience with this product…"
          className="mt-1 block w-full rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
        />
        <p className="mt-1 text-xs text-muted-foreground">{body.trim().length}/2000 characters</p>
      </div>

      {feedback?.kind === 'ok' && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
          <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {feedback.msg}
        </p>
      )}
      {feedback?.kind === 'error' && (
        <p className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {feedback.msg}
        </p>
      )}

      <button
        type="submit"
        disabled={status === 'pending'}
        className="mt-4 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {status === 'pending' ? 'Submitting…' : existingReview ? 'Update review' : 'Submit review'}
      </button>
    </form>
  );
}
