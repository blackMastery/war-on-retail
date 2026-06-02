import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';
import PageBody from '@/components/customer/PageBody';

export async function generateMetadata() {
  const settings = await getStoreSettings();
  return pageMetadata('policies-terms', {
    title: 'Terms of Service',
    description: `Terms of use for the ${settings.name} website and store.`,
  });
}

export default function TermsPage() {
  return <PageBody pageId="policies-terms" />;
}
