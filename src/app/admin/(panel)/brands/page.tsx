import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Admin · Brands' };

export default async function AdminBrandsPage() {
  const supabase = createAdminClient();
  const { data: brands } = await supabase.from('brands').select('*').order('display_order');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Brands</h1>
      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3 text-right">Order</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {brands?.map((b) => (
              <tr key={b.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{b.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{b.slug}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
