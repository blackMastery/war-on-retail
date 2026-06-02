import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';
import PageBody from '@/components/customer/PageBody';

export async function generateMetadata() {
  const settings = await getStoreSettings();
  return pageMetadata('policies-privacy', {
    title: 'Privacy Policy',
    description: `How ${settings.name} collects, uses, and stores customer data.`,
  });
}

export default function PrivacyPolicyPage() {
  return <PageBody pageId="policies-privacy" />;
}
