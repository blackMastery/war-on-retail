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
          50: '#FFFDE7',
          100: '#FFF9C4',
          200: '#FFF176',
          300: '#FFEE58',
          400: '#FFEB3B',
          500: '#FFD700',
          600: '#F0C800',
          700: '#E6B800',
          800: '#CC9900',
          900: '#997300',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FFEB3B',
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
