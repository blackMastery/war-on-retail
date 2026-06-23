import StarRating from './StarRating';

export type ProductReviewDisplay = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  reviewer_name: string;
};

export default function ProductReviewCard({ review }: { review: ProductReviewDisplay }) {
  const date = new Date(review.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="rounded-lg bg-card p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <StarRating rating={review.rating} size="sm" />
        <time className="text-xs text-muted-foreground" dateTime={review.created_at}>
          {date}
        </time>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{review.reviewer_name}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-secondary-foreground">{review.body}</p>
    </article>
  );
}
