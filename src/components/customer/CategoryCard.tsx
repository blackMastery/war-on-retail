import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/types/database';

const ICONS: Record<string, string> = {
  electronics: '📺',
  'home-appliances': '🧊',
  'kitchen-appliances': '🍳',
  'personal-care': '💈',
  computing: '💻',
};

export default function CategoryCard({ category }: { category: Category }) {
  const icon = ICONS[category.slug] ?? '📦';
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center rounded-lg bg-white p-6 text-center shadow-sm ring-1 ring-gray-200 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {category.image_url ? (
        <div className="relative h-16 w-16">
          <Image src={category.image_url} alt={category.name} fill className="object-contain" />
        </div>
      ) : (
        <span className="text-4xl" aria-hidden>
          {icon}
        </span>
      )}
      <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-primary-600">
        {category.name}
      </h3>
    </Link>
  );
}
