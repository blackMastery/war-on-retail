import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FFF5F5',
          100: '#FFE0E0',
          200: '#FFB8B8',
          300: '#FF8080',
          400: '#F04444',
          500: '#E61E1E',
          600: '#C91919',
          700: '#A81414',
          800: '#871010',
          900: '#660C0C',
        },
        accent: {
          50: '#FFFDF0',
          100: '#FFF8E1',
          200: '#FFF3C4',
          300: '#FFEC99',
          400: '#FFE066',
          500: '#FFCC00',
          600: '#E6B800',
          700: '#CC9900',
          800: '#997300',
          900: '#664D00',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FFF3C4',
          dark: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '1.5rem',
          lg: '2rem',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};

export default config;
