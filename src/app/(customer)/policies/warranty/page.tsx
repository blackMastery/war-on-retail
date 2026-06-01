import { siteConfig } from '@/config/site';
import { pageMetadata } from '@/lib/page-seo';

export async function generateMetadata() {
  return pageMetadata('policies-warranty', {
    title: 'Warranty',
    description: `Manufacturer warranty terms and how to make a claim with ${siteConfig.name}.`,
  });
}

const LAST_UPDATED = '2026-05-27';

export default function WarrantyPolicyPage() {
  return (
    <>
      <h1>Warranty</h1>
      <p className="lead">
        <em>Last updated: {LAST_UPDATED}</em>
      </p>

      <p>
        Every product we sell is authentic and carries its <strong>manufacturer warranty</strong>.
        Warranty length varies by product and brand — the specific term is printed on each
        product page and on the receipt you receive at delivery.
      </p>

      <h2>Typical warranty periods</h2>
      <ul>
        <li>
          <strong>Televisions</strong> — 1 year on parts and labour; panel-only warranties vary
          by brand
        </li>
        <li>
          <strong>Refrigerators &amp; large appliances</strong> — 1 year general; compressor
          warranties of 5–10 years from major brands (LG, Samsung, Whirlpool)
        </li>
        <li>
          <strong>Kitchen appliances</strong> — 1 year
        </li>
        <li>
          <strong>Laptops &amp; computing</strong> — 1 year manufacturer warranty (extendable
          via the brand's own programmes)
        </li>
        <li>
          <strong>Personal-care items</strong> — 6 months to 1 year depending on the product
        </li>
        <li>
          <strong>Accessories</strong> (cables, chargers, small electronics) — 30 days
        </li>
      </ul>

      <h2>What the warranty covers</h2>
      <ul>
        <li>Defects in materials and workmanship</li>
        <li>Component failures that occur under normal use</li>
        <li>Replacement of defective parts or, where parts aren't available, the unit itself</li>
      </ul>

      <h2>What it doesn't cover</h2>
      <ul>
        <li>Accidental damage (drops, spills, impact)</li>
        <li>Power-surge damage from sources outside the unit's protection range</li>
        <li>Wear-and-tear cosmetic damage (scratches, scuffs)</li>
        <li>Damage from unauthorised repairs or modifications</li>
        <li>Lost remotes, manuals, or accessories</li>
      </ul>

      <h2>How to make a claim</h2>
      <ol>
        <li>
          Message us on WhatsApp at{' '}
          <a
            href={`https://wa.me/${siteConfig.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            +{siteConfig.whatsapp}
          </a>{' '}
          with the product name, the date of purchase, and a description of the issue. Photos
          or a short video help us diagnose faster.
        </li>
        <li>
          We'll confirm whether the issue is covered and arrange either an in-house repair, a
          dispatch to the brand's authorised service centre, or a replacement.
        </li>
        <li>
          For larger appliances, we can usually arrange in-home assessment within Georgetown.
        </li>
      </ol>

      <h2>Turn-around times</h2>
      <p>
        Most warranty claims resolve within <strong>7–14 business days</strong>. Brand-specific
        service centres (especially for laptops and TVs) sometimes take longer; we'll keep you
        updated on WhatsApp throughout.
      </p>

      <h2>Proof of purchase</h2>
      <p>
        Keep your WhatsApp message thread, receipt, or invoice. Any of these works as proof of
        purchase — we don't require a paper card.
      </p>
    </>
  );
}
