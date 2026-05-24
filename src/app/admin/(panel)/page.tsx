import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Admin · Dashboard' };

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  const [products, categories, brands, faqs, lowStock, recentChat] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('brands').select('id', { count: 'exact', head: true }),
    supabase.from('faqs').select('id', { count: 'exact', head: true }),
    supabase
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold')
      .eq('track_inventory', true)
      .eq('is_active', true)
      .lte('stock_quantity', 5)
      .order('stock_quantity')
      .limit(8),
    supabase
      .from('chatbot_conversations')
      .select('id, user_message, bot_response, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const cards = [
    { label: 'Products', value: products.count ?? 0, href: '/admin/products' },
    { label: 'Categories', value: categories.count ?? 0, href: '/admin/categories' },
    { label: 'Brands', value: brands.count ?? 0, href: '/admin/brands' },
    { label: 'Chatbot FAQs', value: faqs.count ?? 0, href: '/admin/chatbot' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of the catalogue and recent activity.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:shadow-md"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900">{c.value}</p>
          </Link>
        ))}
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-bold">Low stock</h2>
          <p className="text-xs text-gray-500">Active inventory ≤ 5 units.</p>
          <ul className="mt-3 divide-y divide-gray-100">
            {(lowStock.data ?? []).length === 0 && (
              <li className="py-3 text-sm text-gray-500">Nothing low. 🎉</li>
            )}
            {lowStock.data?.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/products/${p.id}/edit`} className="hover:underline">
                  {p.name}
                </Link>
                <span className="font-mono text-xs text-orange-600">{p.stock_quantity} left</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-bold">Recent chatbot conversations</h2>
          <p className="text-xs text-gray-500">Last 5 messages received.</p>
          <ul className="mt-3 space-y-3">
            {(recentChat.data ?? []).length === 0 && (
              <li className="text-sm text-gray-500">No chats yet.</li>
            )}
            {recentChat.data?.map((c) => (
              <li key={c.id} className="rounded bg-gray-50 p-2 text-xs">
                <p className="font-medium text-gray-900">› {c.user_message}</p>
                <p className="mt-1 text-gray-600">{c.bot_response}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
