import { pageMetadata } from '@/lib/page-seo';
import { getStoreSettings } from '@/lib/store-settings';

export async function generateMetadata() {
  return pageMetadata('contact', { title: 'Contact us' });
}

export default async function ContactPage() {
  const settings = await getStoreSettings();
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Get in touch</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        We&apos;re here to help — choose whichever channel works best for you.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href={`https://wa.me/${settings.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-card p-6 shadow-sm ring-1 ring-border hover:shadow-md"
        >
          <div className="text-3xl">💬</div>
          <h2 className="mt-3 font-bold">WhatsApp</h2>
          <p className="mt-1 text-sm text-muted-foreground">+{settings.whatsapp}</p>
          <p className="mt-1 text-sm text-link-on-light">Open chat →</p>
        </a>

        <a
          href={`tel:${settings.phone}`}
          className="rounded-lg bg-card p-6 shadow-sm ring-1 ring-border hover:shadow-md"
        >
          <div className="text-3xl">📞</div>
          <h2 className="mt-3 font-bold">Phone</h2>
          <p className="mt-1 text-sm text-muted-foreground">{settings.phone}</p>
          <p className="mt-1 text-sm text-link-on-light">Call now →</p>
        </a>

        <a
          href={`mailto:${settings.email}`}
          className="rounded-lg bg-card p-6 shadow-sm ring-1 ring-border hover:shadow-md"
        >
          <div className="text-3xl">✉️</div>
          <h2 className="mt-3 font-bold">Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">{settings.email}</p>
          <p className="mt-1 text-sm text-link-on-light">Send a message →</p>
        </a>
      </div>

      <div className="mt-10 rounded-lg bg-card p-6 shadow-sm ring-1 ring-border">
        <h2 className="font-bold">Business hours</h2>
        <ul className="mt-2 text-sm text-muted-foreground">
          <li>{settings.hours.weekdays}</li>
          <li>{settings.hours.saturday}</li>
          <li>{settings.hours.sunday}</li>
        </ul>
        <p className="mt-2 text-sm text-muted-foreground">{settings.address}</p>
      </div>
    </div>
  );
}
