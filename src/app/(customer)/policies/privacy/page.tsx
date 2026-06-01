import { siteConfig } from '@/config/site';
import { pageMetadata } from '@/lib/page-seo';

export async function generateMetadata() {
  return pageMetadata('policies-privacy', {
    title: 'Privacy Policy',
    description: `How ${siteConfig.name} collects, uses, and stores customer data.`,
  });
}

// Last meaningful update — shown to the visitor for trust.
const LAST_UPDATED = '2026-05-27';

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="lead">
        <em>Last updated: {LAST_UPDATED}</em>
      </p>

      <p>
        This policy explains what data {siteConfig.name} collects when you visit our website,
        how we use it, and what choices you have. We've tried to write it in plain language
        rather than legalese — if anything is unclear, please ask.
      </p>

      <h2>What we collect on the website</h2>

      <h3>Stored on your device (browser storage)</h3>
      <p>
        We use your browser's <strong>local storage</strong> — not third-party cookies — to
        remember the things that make the site useful:
      </p>
      <ul>
        <li>
          <strong>Cart</strong> — the products you've added so you can finish your inquiry later.
        </li>
        <li>
          <strong>Wishlist</strong> — products you've saved for later.
        </li>
        <li>
          <strong>Recently viewed</strong> — up to ten product pages you've opened recently,
          surfaced as a strip on the homepage.
        </li>
        <li>
          <strong>Compare list</strong> — products you've queued for side-by-side comparison.
        </li>
        <li>
          <strong>Chat session ID</strong> — a random identifier the chat assistant uses to
          group your messages within one session.
        </li>
      </ul>
      <p>
        All of this stays on your device. We can't read it from our servers, and clearing your
        browser's storage removes all of it.
      </p>

      <h3>Sent to our servers</h3>
      <ul>
        <li>
          <strong>Chat conversations.</strong> When you use the chat assistant, your messages
          and our replies are stored in our database (the random session ID above is attached
          but no other identifying information is). We use this to improve replies and add new
          FAQs.
        </li>
        <li>
          <strong>Standard server logs.</strong> Like every website, our server records each
          request (page URL, browser type, IP address, timestamp). These are kept short-term
          for security and debugging.
        </li>
      </ul>

      <h3>Sent to third parties</h3>
      <ul>
        <li>
          <strong>WhatsApp.</strong> When you click any "Buy via WhatsApp" or "Send inquiry"
          button, you're handed off to WhatsApp with a pre-filled message. From that point on
          the conversation is governed by{' '}
          <a
            href="https://www.whatsapp.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp's privacy policy
          </a>
          .
        </li>
        <li>
          <strong>AI provider.</strong> The chat assistant sends your message (and a short
          excerpt of our FAQs + catalogue) to our AI provider so it can compose a reply. The
          provider does not retain the content for training.
        </li>
      </ul>

      <h2>What we don't do</h2>
      <ul>
        <li>We don't sell your data.</li>
        <li>We don't use third-party tracking or advertising cookies.</li>
        <li>
          We don't collect payment information on the website — purchases are confirmed by our
          team on WhatsApp.
        </li>
      </ul>

      <h2>Cookies (the actual HTTP kind)</h2>
      <p>
        The only HTTP cookies on the site are <strong>authentication cookies</strong> used by
        staff to sign into the admin panel. Customers don't get any tracking cookies set.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>Clear your data.</strong> Use your browser's "Clear site data" feature for
          this site to remove everything stored locally.
        </li>
        <li>
          <strong>Delete a chat conversation.</strong> Reply to us on WhatsApp or email us — we
          can delete records by session ID on request.
        </li>
        <li>
          <strong>Opt out of the chat assistant.</strong> Simply don't open the chat widget.
          The rest of the site works without it.
        </li>
      </ul>

      <h2>Children</h2>
      <p>
        Our site is intended for adults. We don't knowingly collect data from anyone under 16.
        If you believe a child has provided data to us, contact us and we'll remove it.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We'll update the "Last updated" date at the top of this page whenever the policy
        changes. Material changes will be flagged in the cookie notice at the bottom of the
        site.
      </p>
    </>
  );
}
