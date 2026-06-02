import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';
import PageBody from '@/components/customer/PageBody';

export async function generateMetadata() {
  const settings = await getStoreSettings();
  return pageMetadata('policies-shipping', {
    title: 'Shipping & Returns',
    description: `Delivery, returns, and exchange information for ${settings.name}.`,
  });
}

export default function ShippingPolicyPage() {
  return <PageBody pageId="policies-shipping" />;
}
