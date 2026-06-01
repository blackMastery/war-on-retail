import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import Pagination from '@/components/customer/Pagination';
import { paginate, parsePage } from '@/lib/pagination';
import { buildIlikeOrClause } from '@/lib/products/search';

export const metadata = { title: 'Admin · Customers' };
export const dynamic = 'force-dynamic';

const CUSTOMER_PAGE_SIZE = 25;

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const requestedPage = parsePage(sp.page);
  const q = (sp.q ?? '').trim();
  const offset = (requestedPage - 1) * CUSTOMER_PAGE_SIZE;

  const supabase = createAdminClient();

  let query = supabase
    .from('customers')
    .select('id, name, phone, created_at, updated_at', { count: 'exact' });
  if (q) {
    query = query.or(buildIlikeOrClause(q, ['name', 'phone']));
  }

  const { data: customers, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + CUSTOMER_PAGE_SIZE - 1);

  // Order counts per customer — second round-trip, cheap at admin volumes.
  const ids = (customers ?? []).map((c) => c.id);
  const orderCountByCustomer = new Map<string, number>();
  if (ids.length > 0) {
    const { data: orderRows } = await supabase
      .from('orders')
      .select('customer_id')
      .in('customer_id', ids);
    for (const row of orderRows ?? []) {
      if (!row.customer_id) continue;
      orderCountByCustomer.set(
        row.customer_id,
        (orderCountByCustomer.get(row.customer_id) ?? 0) + 1,
      );
    }
  }

  const pag = paginate({
    requestedPage,
    count,
    rows: customers ?? [],
    pageSize: CUSTOMER_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="mt-1 text-sm text-gray-600 tabular-nums">
            {pag.count === 0
              ? 'No customers yet.'
              : pag.count <= CUSTOMER_PAGE_SIZE
                ? `${pag.count} ${pag.count === 1 ? 'customer' : 'customers'}`
                : `Showing ${pag.firstIdx}–${pag.lastIdx} of ${pag.count}`}
          </p>
        </div>
        <form action="/admin/customers" method="get">
          <label htmlFor="admin-customers-q" className="sr-only">
            Search customers
          </label>
          <input
            id="admin-customers-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or phone…"
            className="w-72 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </form>
      </header>

      {(!customers || customers.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No customers to show</p>
          <p className="mt-1 text-sm text-gray-600">
            Customers are added automatically when they place an order at checkout.
          </p>
        </div>
      )}

      {customers && customers.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3">First seen</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3">
                    <a
                      href={`tel:${c.phone}`}
                      className="text-primary-600 hover:underline"
                    >
                      {c.phone}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {orderCountByCustomer.get(c.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleDateString('en-GY', {
                      dateStyle: 'medium',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery={q ? `q=${encodeURIComponent(q)}` : ''}
        basePath="/admin/customers"
      />
    </div>
  );
}
