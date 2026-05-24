import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search' };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;
  const supabase = await createClient();

  const { data: products, error } = await supabase.rpc('search_products', {
    q,
    max_rows: 48,
    page_offset: 0,
  });

  return (
    <main className="container py-10">
      <h1 className="text-2xl font-bold">Search results</h1>
      <p className="mt-1 text-sm text-gray-600">
        {q ? (
          <>
            Showing matches for <span className="font-medium text-gray-900">“{q}”</span>
            {products && ` — ${products.length} found`}
          </>
        ) : (
          'Enter a term in the search bar above to find products.'
        )}
      </p>
      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          Search is temporarily unavailable. Please try again in a moment.
        </p>
      )}
      <div className="mt-6">
        <ProductGrid products={products ?? []} />
      </div>
    </main>
  );
}
