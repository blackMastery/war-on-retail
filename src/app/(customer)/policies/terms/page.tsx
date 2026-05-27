import type { Metadata } from 'next';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of use for the ${siteConfig.name} website and store.`,
};

const LAST_UPDATED = '2026-05-27';

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="lead">
        <em>Last updated: {LAST_UPDATED}</em>
      </p>

      <p>
        These terms cover your use of the {siteConfig.name} website and the inquiry process
        that follows. By browsing, adding items to a cart, or sending us a WhatsApp inquiry
        from this site, you agree to these terms.
      </p>

      <h2>About us</h2>
      <p>
        {siteConfig.name} is an electronics and home-appliance retailer based in {siteConfig.address}.
        You can reach us at{' '}
        <a href={`tel:${siteConfig.phone}`}>{siteConfig.phone}</a> or by emailing{' '}
        <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
      </p>

      <h2>How the site works</h2>
      <p>
        Prices and stock displayed on the website are <strong>indicative</strong>. We confirm
        final pricing, availability, and delivery details with you on WhatsApp before any
        purchase is finalised. Until that confirmation happens, no sale has taken place — the
        cart is an inquiry list, not an order.
      </p>

      <h2>Pricing &amp; currency</h2>
      <p>
        All prices are in <strong>Guyanese Dollars (GYD)</strong>. We try to keep prices on
        the site current, but in the event of a discrepancy, the price quoted by our team on
        WhatsApp at the time of confirmation is the price that applies. If a quoted price ever
        diverges materially from the displayed price, we'll explain why before asking you to
        proceed.
      </p>

      <h2>Product information</h2>
      <p>
        We do our best to describe products accurately, including specs and images. Images may
        differ slightly from the actual product (colour, packaging variants). Specifications
        and feature sets ultimately come from the manufacturer — we link to brand pages where
        useful.
      </p>

      <h2>Inquiries &amp; sales</h2>
      <ul>
        <li>
          Sending an inquiry from the cart is not a binding order. We confirm price, stock,
          and delivery before either party commits.
        </li>
        <li>
          We reserve the right to decline or cancel an inquiry — for example, if a price is
          clearly an error, or if stock is unexpectedly unavailable.
        </li>
        <li>
          Refunds, returns, and warranty claims are covered under our separate{' '}
          <a href="/policies/shipping">Shipping &amp; Returns</a> and{' '}
          <a href="/policies/warranty">Warranty</a> policies.
        </li>
      </ul>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the site to send unsolicited commercial messages</li>
        <li>
          Attempt to bypass security controls, scrape large portions of the catalogue
          programmatically, or interfere with normal operation
        </li>
        <li>Impersonate another person or business in chats or inquiries</li>
        <li>Use the chat assistant for purposes other than asking about our products and services</li>
      </ul>

      <h2>User-generated content</h2>
      <p>
        Anything you submit through the chat assistant or via inquiries (including questions,
        photos sent in a WhatsApp chat) is treated as confidential between you and our team.
        See our <a href="/policies/privacy">Privacy Policy</a> for how chat content is stored.
      </p>

      <h2>Intellectual property</h2>
      <p>
        The {siteConfig.name} brand, logo, and site design are our property. Product names,
        logos, and images belong to their respective manufacturers and are used to describe
        and sell legitimate products.
      </p>

      <h2>Liability</h2>
      <p>
        We provide the site and its content "as is". To the maximum extent permitted by law,
        we're not liable for indirect or consequential losses arising from your use of the
        site (such as data loss or business interruption). Nothing in these terms limits our
        responsibility for defective products, which is covered by the warranty and consumer
        protection law.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms occasionally. Changes take effect from the "Last updated"
        date at the top of the page. Continuing to use the site after a change means you
        accept the updated terms.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the Co-operative Republic of Guyana. Any
        dispute that can't be resolved directly between us is subject to the jurisdiction of
        the Guyanese courts.
      </p>
    </>
  );
}
