export const siteConfig = {
  name: 'War on Retail',
  description: 'Your trusted electronics and home-appliance store in Guyana.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5926943827',
  email: 'info@waronretail.com',
  phone: '592-694-3827',
  address: 'Georgetown, Guyana',

  hours: {
    weekdays: 'Mon–Fri 9:00 AM – 6:00 PM',
    saturday: 'Sat 9:00 AM – 4:00 PM',
    sunday: 'Sun Closed',
  },

  social: {
    facebook: 'https://facebook.com/waronretail',
    instagram: 'https://instagram.com/waronretail',
    twitter: 'https://twitter.com/waronretail',
  },
} as const;

export type SiteConfig = typeof siteConfig;
