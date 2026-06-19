import Link from 'next/link';
import Image from 'next/image';
import { categoryIconFor } from '@/lib/category-icons';
import type { Category } from '@/types/database';

export default function CategoryCard({ category }: { category: Category }) {
  const icon = categoryIconFor(category.slug);
  return (
    <Link
      href={`/categories/${category.slug}`}
      // `h-full` so the card fills its wrapper in flex/grid layouts — without
      // it, cards with single-word names ("Electronics") are shorter than
      // ones whose name wraps to two lines ("Home Appliances"). `justify-center`
      // keeps the icon + name visually centred when the card stretches.
      className="group flex h-full flex-col items-center justify-center rounded-lg bg-card p-6 text-center shadow-sm ring-1 ring-border transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      {category.image_url ? (
        <div className="relative h-16 w-16 transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none">
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
      ) : (
        <span
          className="text-4xl transition-transform duration-200 ease-out group-hover:scale-110 motion-reduce:transform-none"
          aria-hidden
        >
          {icon}
        </span>
      )}
      <h3 className="mt-3 font-semibold text-foreground group-hover:text-link-on-light">
        {category.name}
      </h3>
    </Link>
  );
}
