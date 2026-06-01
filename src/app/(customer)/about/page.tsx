import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';

export async function generateMetadata() {
  return pageMetadata('about', { title: 'About' });
}

export default async function AboutPage() {
  const settings = await getStoreSettings();
  return (
    <div className="container py-10">
      <div className="prose prose-gray max-w-3xl">
        <h1>About {settings.name}</h1>
        <p>
          {settings.name} is Guyana&apos;s trusted source for electronics, home appliances, and
          everyday tech. We carry leading brands like Samsung, LG, Sony, HP, and many more — every
          item authentic and backed by the manufacturer&apos;s warranty.
        </p>
        <h2>Why we exist</h2>
        <p>
          Buying quality electronics in Guyana shouldn&apos;t mean paying a premium for inconsistent
          service. We curate a tight, current catalogue, deliver across the country, and stay
          available on WhatsApp, phone, and chat for whatever you need afterwards.
        </p>
        <h2>How to reach us</h2>
        <p>
          The fastest channel is WhatsApp:{' '}
          <a href={`https://wa.me/${settings.whatsapp}`}>+{settings.whatsapp}</a>.
          You can also call us at <a href={`tel:${settings.phone}`}>{settings.phone}</a> or
          email <a href={`mailto:${settings.email}`}>{settings.email}</a>.
        </p>
      </div>
    </div>
  );
}
