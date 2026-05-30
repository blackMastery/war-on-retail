import { createClient } from '@/lib/supabase/server';
import Header from '@/components/customer/Header';
import Footer from '@/components/customer/Footer';
import Chatbot from '@/components/customer/Chatbot';
import CookieNotice from '@/components/customer/CookieNotice';

export const revalidate = 120;

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // Fetch nav data once at the layout level — every page shares it, no need
  // to repeat the queries per route. 120 s revalidation keeps it fresh
  // without hammering Supabase on every request.
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, parent_id, display_order')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    supabase
      .from('brands')
      .select('id, name, slug, display_order')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header categories={categories ?? []} brands={brands ?? []} />
      <main id="main" tabIndex={-1} className="flex-1 scroll-mt-28 md:scroll-mt-24">
        {children}
      </main>
      <Footer />
      <Chatbot />
      <CookieNotice />
    </div>
  );
}
