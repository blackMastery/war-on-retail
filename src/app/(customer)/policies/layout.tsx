import Link from 'next/link';
import { getStoreSettings } from '@/lib/store-settings';

/**
 * Shared chrome for `/policies/*` pages. Gives every policy page a consistent
 * container width, breadcrumb, and "questions? contact us" footer block.
 *
 * The content of each page is plain JSX with `prose` typography — no MDX
 * pipeline, no CMS layer — so editing a policy is a code change. That's
 * intentional for a small retailer; policy churn is low. Contact details
 * still resolve at runtime from the admin-edited store settings.
 */
export default async function PoliciesLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <div className="container py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-link">
          Home
        </Link>{' '}
        / <span className="text-secondary-foreground">Policies</span>
      </nav>

      <article className="prose-theme max-w-3xl">{children}</article>

      <aside className="mt-12 max-w-3xl rounded-lg bg-secondary p-5 text-sm ring-1 ring-border">
        <p className="font-semibold text-foreground">Questions about this policy?</p>
        <p className="mt-1 text-secondary-foreground">
          The fastest way is WhatsApp:{' '}
          <a
            href={`https://wa.me/${settings.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-link hover:underline"
          >
            +{settings.whatsapp}
          </a>
          . You can also email{' '}
          <a href={`mailto:${settings.email}`} className="font-medium text-link hover:underline">
            {settings.email}
          </a>{' '}
          or call{' '}
          <a href={`tel:${settings.phone}`} className="font-medium text-link hover:underline">
            {settings.phone}
          </a>
          .
        </p>
      </aside>
    </div>
  );
}
