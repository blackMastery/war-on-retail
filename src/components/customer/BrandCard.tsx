import Link from 'next/link';
import Image from 'next/image';
import type { Brand } from '@/types/database';

export default function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      aria-label={brand.name}
      className="flex h-20 items-center justify-center rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
    >
      {brand.logo_url ? (
        <div className="relative h-12 w-full">
          <Image src={brand.logo_url} alt={brand.name} fill className="object-contain" />
        </div>
      ) : (
        // Brand names should never be auto-translated by the browser.
        <span translate="no" className="font-semibold text-gray-700">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
