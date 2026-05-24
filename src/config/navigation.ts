/**
 * Static top-nav structure. Categories shown here mirror the seeded taxonomy
 * in `supabase/migrations/20260101000300_seed_taxonomy.sql` — keep them in sync.
 */
export type NavItem = { label: string; href: string; highlight?: boolean };

export const primaryNav: readonly NavItem[] = [
  { label: 'All Categories', href: '/categories' },
  { label: 'Brands', href: '/brands' },
  { label: 'Electronics', href: '/categories/electronics' },
  { label: 'Home Appliances', href: '/categories/home-appliances' },
  { label: 'Kitchen', href: '/categories/kitchen-appliances' },
  { label: 'Deals', href: '/deals', highlight: true },
];

export const footerLinks = {
  shop: [
    { label: 'Electronics', href: '/categories/electronics' },
    { label: 'Home Appliances', href: '/categories/home-appliances' },
    { label: 'Kitchen', href: '/categories/kitchen-appliances' },
    { label: 'Computing', href: '/categories/computing' },
    { label: 'Personal Care', href: '/categories/personal-care' },
  ],
  help: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'Shipping & Returns', href: '/policies/shipping' },
    { label: 'Warranty', href: '/policies/warranty' },
    { label: 'FAQ', href: '/faq' },
  ],
  company: [
    { label: 'About', href: '/about' },
    { label: 'Privacy Policy', href: '/policies/privacy' },
    { label: 'Terms of Service', href: '/policies/terms' },
  ],
} as const;
