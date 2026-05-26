import Image from 'next/image';
import Link from 'next/link';
import type { Promotion } from '@/types/database';

/**
 * Renders a "labour day sale"-style mosaic of admin-uploaded promotion images.
 *
 * Layout choice:
 *   - One large featured tile (always the first promotion with `is_featured = true`,
 *     or just the first promotion when none are featured).
 *   - Remaining promotions render as smaller tiles in a 2-up grid beside / below.
 *
 * Each tile may have a `link_url` set by the admin. Internal paths use
 * Next's `<Link>` (client-side nav); external `https://…` URLs use a plain
 * anchor in a new tab. Promotions without a link render as a plain `<figure>`.
 */
export default function PromotionMosaic({ promotions }: { promotions: Promotion[] }) {
  if (promotions.length === 0) return null;

  // Pick a featured tile: explicit `is_featured` wins, otherwise first in order.
  const featuredIdx = Math.max(
    0,
    promotions.findIndex((p) => p.is_featured),
  );
  const featured = promotions[featuredIdx];
  const rest = promotions.filter((_, i) => i !== featuredIdx);

  return (
    <section aria-label="Current specials" className="bg-gray-100">
      <div className="container py-8 md:py-12">
        <div
          className={`grid gap-4 ${
            rest.length === 0
              ? 'grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-[2fr_1fr]'
          }`}
        >
          {/* Featured tile */}
          <Tile promotion={featured} priority aspect="aspect-[16/10]" />

          {/* Side tiles, when there are extras */}
          {rest.length > 0 && (
            <div
              className={`grid gap-4 ${
                rest.length === 1 ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-1'
              }`}
            >
              {rest.slice(0, 4).map((p) => (
                <Tile key={p.id} promotion={p} aspect="aspect-[16/10] lg:aspect-[16/9]" />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Renders the image, wrapped in the right kind of link if `link_url` is set.
 *
 * The `<figure>` keeps semantic structure regardless of click-ability so
 * screen readers always announce a banner; the link wrapper is the
 * outer-most element so the whole tile is one big tap target.
 */
function Tile({
  promotion,
  priority = false,
  aspect,
}: {
  promotion: Promotion;
  priority?: boolean;
  aspect: string;
}) {
  const inner = (
    <figure
      className={`relative h-full w-full overflow-hidden rounded-lg bg-gray-200 shadow-sm ring-1 ring-gray-200 transition-shadow ${
        promotion.link_url ? 'group-hover:shadow-md group-focus-visible:shadow-md' : ''
      } ${aspect}`}
    >
      <Image
        src={promotion.image_url}
        alt={promotion.title}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 66vw, 100vw"
        className={`object-cover ${
          promotion.link_url
            ? 'transition-transform duration-300 group-hover:scale-[1.02]'
            : ''
        }`}
      />
    </figure>
  );

  if (!promotion.link_url) return inner;

  // Internal paths start with "/" — use Next Link for SPA navigation.
  if (promotion.link_url.startsWith('/')) {
    return (
      <Link
        href={promotion.link_url}
        aria-label={promotion.title}
        className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }

  // External URL — open in a new tab to keep the storefront in place.
  return (
    <a
      href={promotion.link_url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${promotion.title} (opens in a new tab)`}
      className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
    >
      {inner}
    </a>
  );
}
