import Link from 'next/link';
import Image from 'next/image';
import type { Brand } from '@/types/database';

export default function BrandCard({ brand }: { brand: Brand }) {
  return (
    <Link
      href={`/brands/${brand.slug}`}
      aria-label={brand.name}
      className="group flex h-20 items-center justify-center rounded-lg bg-card p-3 shadow-sm ring-1 ring-border transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md motion-reduce:transform-none"
    >
      {brand.logo_url ? (
        <div className="relative h-12 w-full transition-transform duration-200 ease-out group-hover:scale-105 motion-reduce:transform-none">
          <Image src={brand.logo_url} alt={brand.name} fill className="object-contain" />
        </div>
      ) : (
        // Brand names should never be auto-translated by the browser.
        <span translate="no" className="font-semibold text-secondary-foreground">
          {brand.name}
        </span>
      )}
    </Link>
  );
}
