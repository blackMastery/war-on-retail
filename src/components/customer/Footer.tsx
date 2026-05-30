import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { footerLinks } from '@/config/navigation';

// Computed at module-load on the server — stable for SSR + hydration.
const COPYRIGHT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="mt-16 bg-surface-dark text-gray-300">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Image
              src="/logo.png"
              alt={siteConfig.name}
              width={180}
              height={85}
              className="h-12 w-auto"
            />
            <p className="mt-3 text-pretty text-sm">{siteConfig.description}</p>
            <p className="mt-4 text-sm">
              <a href={`tel:${siteConfig.phone}`} className="hover:text-white">
                <span aria-hidden="true">📞 </span>
                {siteConfig.phone}
              </a>
              <br />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                <span aria-hidden="true">✉ </span>
                {siteConfig.email}
              </a>
              <br />
              {siteConfig.address}
            </p>
          </div>

          <FooterColumn title="Shop" items={footerLinks.shop} />
          <FooterColumn title="Help" items={footerLinks.help} />
          <FooterColumn title="Company" items={footerLinks.company} />
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-gray-800 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center">
          <p>
            © {COPYRIGHT_YEAR} <span translate="no">{siteConfig.name}</span>. All rights reserved.
          </p>
          <ul className="flex gap-4">
            <li>
              <a
                href={siteConfig.social.facebook}
                aria-label={`${siteConfig.name} on Facebook`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Facebook
              </a>
            </li>
            <li>
              <a
                href={siteConfig.social.instagram}
                aria-label={`${siteConfig.name} on Instagram`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Instagram
              </a>
            </li>
            <li>
              <a
                href={siteConfig.social.twitter}
                aria-label={`${siteConfig.name} on Twitter`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white"
              >
                Twitter
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: readonly { readonly label: string; readonly href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
