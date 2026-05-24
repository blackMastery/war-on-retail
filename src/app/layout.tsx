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
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: 'website',
  },
};

// `theme-color` matches the page background so iOS Safari's chrome blends in.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
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
