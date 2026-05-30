import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { siteConfig } from '@/config/site';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  // Favicon (`src/app/icon.png`) and Apple touch icon (`src/app/apple-icon.png`)
  // are picked up automatically via the App Router file convention — regenerate
  // them with `npm run favicon`. The OG / Twitter images below point at the wide
  // logo.png on purpose: social previews look right with the rectangular tag.
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: 'website',
    images: [{ url: '/logo.png', alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    images: ['/logo.png'],
  },
};

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
