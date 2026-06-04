import Link from 'next/link';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/admin';
import DeleteBrandButton from './DeleteBrandButton';

export const metadata = { title: 'Admin · Brands' };

export default async function AdminBrandsPage() {
  const supabase = createAdminClient();

  // Pull brand list AND product counts in parallel so the table can show
  // how many products each brand owns — useful before deactivating.
  const [{ data: brands }, { data: productCounts }] = await Promise.all([
    supabase.from('brands').select('*').order('display_order').order('name'),
    supabase
      .from('products')
      .select('brand_id')
      .eq('is_active', true)
      .not('brand_id', 'is', null),
  ]);

  const countByBrand = new Map<string, number>();
  for (const row of productCounts ?? []) {
    if (!row.brand_id) continue;
    countByBrand.set(row.brand_id, (countByBrand.get(row.brand_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Brands</h1>
          <p className="mt-1 text-sm text-gray-600">
            The brand list shown on <Link href="/brands" className="text-primary-600 hover:underline">/brands</Link>.
          </p>
        </div>
        <Link
          href="/admin/brands/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + New brand
        </Link>
      </header>

      {(!brands || brands.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No brands yet</p>
          <p className="mt-1 text-sm text-gray-600">Create one to start tagging products.</p>
        </div>
      )}

      {brands && brands.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Logo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3 text-right">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {brands.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="w-20 px-4 py-3">
                    {b.logo_url ? (
                      <div className="relative h-10 w-16">
                        <Image
                          src={b.logo_url}
                          alt={b.name}
                          fill
                          sizes="64px"
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400" aria-hidden="true">
                        —
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.slug}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {countByBrand.get(b.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">{b.display_order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {b.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link
                        href={`/admin/brands/${b.id}/edit`}
                        className="font-medium text-primary-600 hover:underline"
                      >
                        Edit
                      </Link>
                      <DeleteBrandButton id={b.id} name={b.name} isActive={b.is_active} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
