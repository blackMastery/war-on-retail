import { formatPrice } from '@/lib/utils';
import type { CartItem } from './types';

/**
 * Minimal slice of store settings these helpers need. The customer cart
 * threads these in from `getStoreSettings()` server-side — keeping them
 * passed-in (rather than imported from `siteConfig`) means the admin's saved
 * brand name + WhatsApp number show up immediately, with no `siteConfig`
 * fallback drift.
 */
export type CartStoreInfo = { name: string; whatsapp: string };

/**
 * Builds the body of the WhatsApp inquiry message a customer sends from
 * `/cart`. Format is plain-text (WhatsApp strips markdown anyway) and
 * deliberately scannable — staff on the other end should be able to read it
 * once and pull stock without rephrasing.
 *
 * Example output:
 *
 *   Hi War on Retail, I'd like to inquire about:
 *
 *   1. Samsung 55" 4K Smart TV (SKU: SAMS-TV-55-4K-001) × 1 — GYD $325,000
 *   2. LG 2-Door Top-Freezer Refrigerator 18 cu ft × 2 — GYD $430,000
 *
 *   Subtotal: GYD $755,000
 *
 *   Please confirm availability and let me know about delivery. Thanks!
 */
export function buildInquiryMessage(items: CartItem[], info: CartStoreInfo): string {
  if (items.length === 0) return '';

  const lines: string[] = [];
  lines.push(`Hi ${info.name}, I'd like to inquire about:`);
  lines.push('');

  let subtotal = 0;
  items.forEach((item, i) => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    const skuPart = item.sku ? ` (SKU: ${item.sku})` : '';
    lines.push(
      `${i + 1}. ${item.name}${skuPart} × ${item.quantity} — ${formatPrice(lineTotal)}`,
    );
  });

  lines.push('');
  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  lines.push('');
  lines.push('Please confirm availability and let me know about delivery. Thanks!');

  return lines.join('\n');
}

/** Returns the full WhatsApp deep-link URL with the inquiry message URL-encoded. */
export function buildInquiryUrl(items: CartItem[], info: CartStoreInfo): string {
  const body = buildInquiryMessage(items, info);
  return `https://wa.me/${info.whatsapp}?text=${encodeURIComponent(body)}`;
}
