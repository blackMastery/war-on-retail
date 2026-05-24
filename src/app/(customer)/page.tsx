import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CategoryCard from '@/components/customer/CategoryCard';
import BrandCard from '@/components/customer/BrandCard';
import ProductGrid from '@/components/customer/ProductGrid';

export const revalidate = 60;

export default async function Homepage() {
  const supabase = await createClient();

  const [{ data: featured }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .is('parent_id', null)
      .order('display_order'),
    supabase.from('brands').select('*').eq('is_active', true).order('display_order').limit(12),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-r from-primary-700 to-primary-500 text-white">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Electronics & home appliances, delivered across Guyana.
            </h1>
            <p className="mt-4 text-lg opacity-95 md:text-xl">
              Authentic products, manufacturer warranties, and real human support — every order.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/categories"
                className="inline-block rounded-md bg-white px-6 py-3 font-semibold text-primary-700 hover:bg-gray-100"
              >
                Shop categories
              </Link>
              <Link
                href="/deals"
                className="inline-block rounded-md border-2 border-white px-6 py-3 font-semibold hover:bg-white/10"
              >
                🔥 Today's deals
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Shop by category</h2>
          <Link href="/categories" className="text-sm font-medium text-primary-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categories?.map((c) => <CategoryCard key={c.id} category={c} />)}
        </div>
      </section>

      {/* Featured products */}
      <section className="bg-gray-100">
        <div className="container py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Featured products</h2>
            <Link
              href="/products"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              All products →
            </Link>
          </div>
          <ProductGrid products={featured ?? []} />
        </div>
      </section>

      {/* Brands */}
      <section className="container py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Popular brands</h2>
          <Link href="/brands" className="text-sm font-medium text-primary-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {brands?.map((b) => <BrandCard key={b.id} brand={b} />)}
        </div>
      </section>

      {/* Value props */}
      <section className="container py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: '🚚', title: 'Fast delivery', body: 'Same-day Georgetown, 2–5 days nationwide.' },
            { icon: '💯', title: 'Authentic', body: 'Direct from manufacturers and authorised dealers.' },
            { icon: '🤝', title: 'Real support', body: 'Chat with the team on WhatsApp or right here.' },
          ].map((v) => (
            <div
              key={v.title}
              className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="text-3xl">{v.icon}</div>
              <h3 className="mt-3 font-bold">{v.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
