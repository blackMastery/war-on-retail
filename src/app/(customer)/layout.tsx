import { createClient } from '@/lib/supabase/server';
import Header from '@/components/customer/Header';
import Footer from '@/components/customer/Footer';
import Chatbot from '@/components/customer/Chatbot';
import CookieNotice from '@/components/customer/CookieNotice';
import WishlistSync from '@/components/customer/WishlistSync';
import MotionProvider from '@/components/customer/motion/MotionProvider';
import { getStoreSettings } from '@/lib/store-settings';

export const revalidate = 120;

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  // Fetch nav data + admin-edited store settings once at the layout level —
  // every page shares them, no need to repeat the queries per route.
  const supabase = await createClient();
  const [{ data: categories }, { data: brands }, settings, { data: auth }] = await Promise.all([
    supabase
      .from('categories')
      .select('id, name, slug, parent_id, display_order, image_url')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    supabase
      .from('brands')
      .select('id, name, slug, display_order, logo_url')
      .eq('is_active', true)
      .order('display_order')
      .order('name'),
    getStoreSettings(),
    supabase.auth.getUser(),
  ]);
  const isAuthed = !!auth?.user;

  // Header is a client component; pass only the slice it needs so the
  // bundle stays small.
  const headerSettings = {
    name: settings.name,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    hoursWeekdays: settings.hours.weekdays,
  };

  return (
    <MotionProvider>
      <div className="flex min-h-screen flex-col">
        <Header
          categories={categories ?? []}
          brands={brands ?? []}
          settings={headerSettings}
          isAuthed={isAuthed}
        />
        <main id="main" tabIndex={-1} className="flex-1 scroll-mt-28 md:scroll-mt-24">
          {children}
        </main>
        <Footer settings={settings} />
        <Chatbot settings={{ name: settings.name, whatsapp: settings.whatsapp }} />
        <CookieNotice />
        <WishlistSync />
      </div>
    </MotionProvider>
  );
}
