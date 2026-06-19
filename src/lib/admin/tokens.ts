import type { OrderStatus } from '@/types/database';

/** Badge tones for order status — readable on white card/table surfaces. */
export const ORDER_STATUS_BADGE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-neutral-100 text-neutral-600',
};

/** Top-border accent for order status cards on the dashboard. Pair with `bg-card`. */
export const ORDER_STATUS_CARD_ACCENT: Record<OrderStatus, string> = {
  pending: 'border-t-primary',
  approved: 'border-t-blue-500',
  fulfilled: 'border-t-emerald-500',
  cancelled: 'border-t-neutral-400',
};

/** Alerts shown directly on the dark admin page background. */
export const ADMIN_ALERT = {
  warning:
    'rounded-md bg-accent/20 p-3 text-sm text-accent-foreground ring-1 ring-accent/40',
  error:
    'rounded-md bg-destructive/15 p-3 text-sm text-red-200 ring-1 ring-destructive/40',
  success:
    'rounded-md bg-emerald-500/15 p-3 text-sm text-emerald-200 ring-1 ring-emerald-500/30',
  info: 'rounded-md bg-blue-500/15 p-3 text-sm text-blue-200 ring-1 ring-blue-500/30',
} as const;

/** Alerts inside white card surfaces (login forms, import results, etc.). */
export const ADMIN_ALERT_ON_CARD = {
  error: 'rounded-md bg-red-50 p-3 text-sm text-red-700',
  success: 'rounded-md bg-green-50 p-3 text-sm text-green-800',
} as const;
