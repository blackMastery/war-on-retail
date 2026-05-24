import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import ProductCard from '@/components/customer/ProductCard';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('name, short_description, meta_title, meta_description')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: 'Product not found' };
  return {
    title: data.meta_title ?? data.name,
    description: data.meta_description ?? data.short_description ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: category }, { data: brand }] = await Promise.all([
    product.category_id
      ? supabase.from('categories').select('*').eq('id', product.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    product.brand_id
      ? supabase.from('brands').select('*').eq('id', product.brand_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const discount = calculateDiscount(product.price, product.compare_at_price);
  const allImages = [product.featured_image_url, ...(product.image_urls ?? [])].filter(
    Boolean,
  ) as string[];
  const isOutOfStock = product.track_inventory && product.stock_quantity === 0;
  const specs = (product.specifications ?? {}) as Record<string, unknown>;

  const { data: related } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('category_id', product.category_id ?? '')
    .neq('id', product.id)
    .limit(4);

  const inquiryMessage = encodeURIComponent(
    `Hi War on Retail, I'm interested in "${product.name}" (SKU ${product.sku ?? 'n/a'}).`,
  );

  return (
    <main className="container py-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-600">
          Home
        </Link>{' '}
        /{' '}
        {category && (
          <>
            <Link
              href={`/categories/${category.slug}`}
              className="hover:text-primary-600"
            >
              {category.name}
            </Link>{' '}
            /{' '}
          </>
        )}
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200">
            {allImages[0] ? (
              <Image
                src={allImages[0]}
                alt={product.name}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-7xl text-gray-300">
                📦
              </div>
            )}
            {discount > 0 && (
              <span className="absolute left-3 top-3 rounded bg-primary-600 px-2 py-0.5 text-sm font-bold text-white">
                -{discount}%
              </span>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {allImages.slice(1).map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded ring-1 ring-gray-200"
                >
                  <Image src={src} alt="" fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail */}
        <div>
          {brand && (
            <Link
              href={`/brands/${brand.slug}`}
              className="text-sm font-medium uppercase tracking-wide text-primary-600 hover:underline"
            >
              {brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.sku && <p className="mt-1 text-xs text-gray-500">SKU: {product.sku}</p>}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>

          {product.short_description && (
            <p className="mt-4 text-gray-700">{product.short_description}</p>
          )}

          <div className="mt-6 rounded-md bg-gray-50 p-4 ring-1 ring-gray-200">
            {isOutOfStock ? (
              <p className="font-semibold text-red-600">Currently out of stock</p>
            ) : (
              <p className="text-sm">
                {product.track_inventory ? (
                  <>
                    <span className="font-semibold text-green-700">In stock</span>{' '}
                    <span className="text-gray-500">— {product.stock_quantity} available</span>
                  </>
                ) : (
                  <span className="font-semibold text-green-700">In stock</span>
                )}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://wa.me/${siteConfig.whatsapp}?text=${inquiryMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              💬 Buy via WhatsApp
            </a>
            <a
              href={`tel:${siteConfig.phone}`}
              className="inline-flex items-center gap-2 rounded-md border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              📞 Call {siteConfig.phone}
            </a>
          </div>

          {Object.keys(specs).length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
              <dl className="overflow-hidden rounded-md ring-1 ring-gray-200">
                {Object.entries(specs).map(([k, v], i) => (
                  <div
                    key={k}
                    className={`grid grid-cols-3 text-sm ${i % 2 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <dt className="col-span-1 px-4 py-2 font-medium text-gray-600">
                      {k.replace(/_/g, ' ')}
                    </dt>
                    <dd className="col-span-2 px-4 py-2 text-gray-900">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div className="prose prose-sm mt-8 max-w-none">
              <h2 className="text-lg font-semibold">Description</h2>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {related && related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
