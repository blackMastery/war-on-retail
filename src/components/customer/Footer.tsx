import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { footerLinks } from '@/config/navigation';

export default function Footer() {
  return (
    <footer className="mt-16 bg-gray-900 text-gray-300">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-lg font-bold text-white">
              <span className="text-primary-500">War on</span> Retail
            </div>
            <p className="mt-3 text-sm">{siteConfig.description}</p>
            <p className="mt-4 text-sm">
              <a href={`tel:${siteConfig.phone}`} className="hover:text-white">
                📞 {siteConfig.phone}
              </a>
              <br />
              <a href={`mailto:${siteConfig.email}`} className="hover:text-white">
                ✉ {siteConfig.email}
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
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href={siteConfig.social.facebook} className="hover:text-white">
              Facebook
            </a>
            <a href={siteConfig.social.instagram} className="hover:text-white">
              Instagram
            </a>
            <a href={siteConfig.social.twitter} className="hover:text-white">
              Twitter
            </a>
          </div>
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
