import { siteConfig } from '@/config/site';

export const metadata = { title: 'Contact us' };

export default function ContactPage() {
  return (
    <main className="container py-10">
      <h1 className="text-3xl font-bold">Get in touch</h1>
      <p className="mt-2 max-w-2xl text-gray-600">
        We're here to help — choose whichever channel works best for you.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <a
          href={`https://wa.me/${siteConfig.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:shadow-md"
        >
          <div className="text-3xl">💬</div>
          <h2 className="mt-3 font-bold">WhatsApp</h2>
          <p className="mt-1 text-sm text-gray-600">+{siteConfig.whatsapp}</p>
          <p className="mt-1 text-sm text-primary-600">Open chat →</p>
        </a>

        <a
          href={`tel:${siteConfig.phone}`}
          className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:shadow-md"
        >
          <div className="text-3xl">📞</div>
          <h2 className="mt-3 font-bold">Phone</h2>
          <p className="mt-1 text-sm text-gray-600">{siteConfig.phone}</p>
          <p className="mt-1 text-sm text-primary-600">Call now →</p>
        </a>

        <a
          href={`mailto:${siteConfig.email}`}
          className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200 hover:shadow-md"
        >
          <div className="text-3xl">✉️</div>
          <h2 className="mt-3 font-bold">Email</h2>
          <p className="mt-1 text-sm text-gray-600">{siteConfig.email}</p>
          <p className="mt-1 text-sm text-primary-600">Send a message →</p>
        </a>
      </div>

      <div className="mt-10 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-bold">Business hours</h2>
        <ul className="mt-2 text-sm text-gray-600">
          <li>{siteConfig.hours.weekdays}</li>
          <li>{siteConfig.hours.saturday}</li>
          <li>{siteConfig.hours.sunday}</li>
        </ul>
        <p className="mt-2 text-sm text-gray-600">{siteConfig.address}</p>
      </div>
    </main>
  );
}
