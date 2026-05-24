import { siteConfig } from '@/config/site';

export const metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <main className="container py-10">
      <div className="prose prose-gray max-w-3xl">
        <h1>About {siteConfig.name}</h1>
        <p>
          {siteConfig.name} is Guyana's trusted source for electronics, home appliances, and
          everyday tech. We carry leading brands like Samsung, LG, Sony, HP, and many more — every
          item authentic and backed by the manufacturer's warranty.
        </p>
        <h2>Why we exist</h2>
        <p>
          Buying quality electronics in Guyana shouldn't mean paying a premium for inconsistent
          service. We curate a tight, current catalogue, deliver across the country, and stay
          available on WhatsApp, phone, and chat for whatever you need afterwards.
        </p>
        <h2>How to reach us</h2>
        <p>
          The fastest channel is WhatsApp: <a href={`https://wa.me/${siteConfig.whatsapp}`}>+{siteConfig.whatsapp}</a>.
          You can also call us at <a href={`tel:${siteConfig.phone}`}>{siteConfig.phone}</a> or
          email <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
        </p>
      </div>
    </main>
  );
}
