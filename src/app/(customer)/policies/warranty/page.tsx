import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';
import PageBody from '@/components/customer/PageBody';

export async function generateMetadata() {
  const settings = await getStoreSettings();
  return pageMetadata('policies-warranty', {
    title: 'Warranty',
    description: `Manufacturer warranty terms and how to make a claim with ${settings.name}.`,
  });
}

export default function WarrantyPolicyPage() {
  return <PageBody pageId="policies-warranty" />;
}
