import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { getStoreSettings } from '@/lib/store-settings';
import './globals.css';
import { Analytics } from "@vercel/analytics/next"
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

/**
 * Root SEO metadata is now driven by the admin-edited store settings, with
 * env-var fallbacks. `generateMetadata` (async) lets us await `getStoreSettings()`;
 * the resulting tags update without a redeploy when the admin saves.
 */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getStoreSettings();
  return {
    metadataBase: new URL(s.url),
    title: {
      default: s.name,
      template: `%s · ${s.name}`,
    },
    description: s.description,
    // Favicon (`src/app/icon.png`) and Apple touch icon (`src/app/apple-icon.png`)
    // are picked up automatically via the App Router file convention — regenerate
    // them with `npm run favicon`. The OG / Twitter images below point at the wide
    // logo.png on purpose: social previews look right with the rectangular tag.
    openGraph: {
      title: s.name,
      description: s.description,
      url: s.url,
      siteName: s.name,
      type: 'website',
      images: [{ url: '/logo.png', alt: s.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: s.name,
      description: s.description,
      images: ['/logo.png'],
    },
  };
}

// `theme-color` matches the page background so iOS Safari's chrome blends in.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFD700' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <Analytics />
      <body className="font-sans">
        {/* Keyboard skip-link — invisible until focused, then jumps past the header. */}
        <a
          href="#main"
          className="skip-link rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-md"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
