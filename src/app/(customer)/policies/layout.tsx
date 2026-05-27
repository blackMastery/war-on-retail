import Link from 'next/link';
import { siteConfig } from '@/config/site';

/**
 * Shared chrome for `/policies/*` pages. Gives every policy page a consistent
 * container width, breadcrumb, and "questions? contact us" footer block.
 *
 * The content of each page is plain JSX with `prose` typography — no MDX
 * pipeline, no CMS layer — so editing a policy is a code change. That's
 * intentional for a small retailer; policy churn is low.
 */
export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-600">
          Home
        </Link>{' '}
        / <span className="text-gray-700">Policies</span>
      </nav>

      <article className="prose prose-gray max-w-3xl">{children}</article>

      <aside className="mt-12 max-w-3xl rounded-lg bg-gray-50 p-5 text-sm ring-1 ring-gray-200">
        <p className="font-semibold text-gray-900">Questions about this policy?</p>
        <p className="mt-1 text-gray-700">
          The fastest way is WhatsApp:{' '}
          <a
            href={`https://wa.me/${siteConfig.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary-600 hover:underline"
          >
            +{siteConfig.whatsapp}
          </a>
          . You can also email{' '}
          <a href={`mailto:${siteConfig.email}`} className="font-medium text-primary-600 hover:underline">
            {siteConfig.email}
          </a>{' '}
          or call{' '}
          <a href={`tel:${siteConfig.phone}`} className="font-medium text-primary-600 hover:underline">
            {siteConfig.phone}
          </a>
          .
        </p>
      </aside>
    </div>
  );
}
