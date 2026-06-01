import { siteConfig } from '@/config/site';
import { pageMetadata } from '@/lib/page-seo';

export async function generateMetadata() {
  return pageMetadata('policies-shipping', {
    title: 'Shipping & Returns',
    description: `Delivery, returns, and exchange information for ${siteConfig.name}.`,
  });
}

const LAST_UPDATED = '2026-05-27';

export default function ShippingPolicyPage() {
  return (
    <>
      <h1>Shipping &amp; Returns</h1>
      <p className="lead">
        <em>Last updated: {LAST_UPDATED}</em>
      </p>

      <p>
        We deliver across Guyana. Order details, delivery scheduling, and payment are all
        confirmed by our team on WhatsApp after you send an inquiry from the cart.
      </p>

      <h2>Delivery areas &amp; timing</h2>
      <ul>
        <li>
          <strong>Georgetown</strong> — same-day delivery on inquiries received before 2 PM,
          next business day otherwise.
        </li>
        <li>
          <strong>Outside Georgetown</strong> — typically 2–5 business days depending on
          location and item size. Our team will confirm an exact window when you inquire.
        </li>
        <li>
          <strong>Heavy items</strong> (refrigerators, large TVs, washing machines) — scheduled
          by appointment so someone's available to receive them.
        </li>
      </ul>

      <h2>Delivery fees</h2>
      <p>
        <strong>Free delivery within Georgetown</strong> on orders over GYD&nbsp;$20,000.
        Smaller orders within Georgetown, and all out-of-town deliveries, have a fee that
        depends on location, weight, and item size. We quote this with your inquiry — no
        hidden charges.
      </p>

      <h2>Payment</h2>
      <p>
        We accept <strong>cash on delivery</strong>, <strong>bank transfer</strong>, and{' '}
        <strong>major debit and credit cards</strong>. Mobile-money options are being added —
        ask our team for the latest.
      </p>

      <h2>Returns</h2>
      <p>
        You can return most items <strong>within 7 days of delivery</strong> if they are:
      </p>
      <ul>
        <li>Unused and in their original condition</li>
        <li>In their original packaging with all accessories and manuals</li>
        <li>Accompanied by proof of purchase (WhatsApp message thread, receipt, or invoice)</li>
      </ul>
      <p>
        To start a return, message us on WhatsApp at{' '}
        <a
          href={`https://wa.me/${siteConfig.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          +{siteConfig.whatsapp}
        </a>{' '}
        with your order details. We'll arrange pickup or drop-off and confirm the refund or
        exchange.
      </p>

      <h2>Exchanges</h2>
      <p>
        Exchanges follow the same 7-day window. You can exchange for a different size, colour,
        or model — the price difference (either way) is settled at the time of exchange.
      </p>

      <h2>What can't be returned</h2>
      <ul>
        <li>
          <strong>Software / digital activations</strong> — once a licence key is provided,
          it's non-refundable.
        </li>
        <li>
          <strong>Items damaged by use</strong> — accidental damage, water damage, dropped
          items. These can sometimes be repaired under warranty — see our{' '}
          <a href="/policies/warranty">warranty policy</a>.
        </li>
        <li>
          <strong>Hygiene items</strong> (earbuds, headphones once worn) — unless unopened.
        </li>
      </ul>

      <h2>Defective on arrival</h2>
      <p>
        If an item arrives defective or doesn't power on, contact us within 48 hours and
        we'll replace it at no extra cost. Photos help speed this up — please include them in
        your WhatsApp message.
      </p>
    </>
  );
}
