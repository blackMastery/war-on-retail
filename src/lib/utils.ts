import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Conditional Tailwind class merger. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a Guyanese-dollar amount, e.g. 125000 → "GYD $125,000".
 * `Intl.NumberFormat` with `en-GY` produces the local thousands grouping.
 */
export function formatPrice(price: number, opts: { currency?: boolean } = {}): string {
  const { currency = true } = opts;
  const formatted = new Intl.NumberFormat('en-GY', {
    maximumFractionDigits: 0,
  }).format(price);
  return currency ? `GYD $${formatted}` : `$${formatted}`;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function calculateDiscount(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '…';
}

/**
 * Build a stable session ID for the chatbot. Stored client-side in localStorage
 * so a returning visitor's conversation history can be reconstructed.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  const key = 'wor_chat_session';
  let id = window.localStorage.getItem(key);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(key, id);
  }
  return id;
}
