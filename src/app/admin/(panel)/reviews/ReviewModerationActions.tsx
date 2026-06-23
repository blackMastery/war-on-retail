'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveReviewAction, rejectReviewAction } from './actions';
import type { ReviewStatus } from '@/types/database';

export default function ReviewModerationActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: ReviewStatus;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  async function run(action: () => Promise<void>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    start(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Action failed.');
      }
    });
  }

  if (status !== 'pending') {
    return (
      <span className="text-xs capitalize text-muted-foreground">{status}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => run(() => approveReviewAction(reviewId), 'Approve this review?')}
        disabled={pending}
        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
      >
        Approve
      </button>
      <button
        type="button"
        onClick={() =>
          run(() => rejectReviewAction(reviewId), 'Reject this review? It will not appear on the product page.')
        }
        disabled={pending}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        Reject
      </button>
    </div>
  );
}
