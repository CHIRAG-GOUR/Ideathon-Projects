import type { Config } from 'tailwindcss';

// Fortiva — CONNECTED. Warm white, cobalt and turquoise with soft lavender; coral only for emergencies.
export default {
  content: ['./src/**/*.{ts,tsx}', '../../safety-core/web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#FFFCF8', 100: '#FAF6F0', 200: '#F2ECE3' },
        cobalt: { 50: '#EEF3FF', 100: '#DCE6FF', 200: '#B9CCFF', 300: '#8AA8FF', 400: '#5B82F7', 500: '#3461EA', 600: '#2347D9', 700: '#1B37B0', 800: '#172E8C', 900: '#13245F' },
        teal: { 50: '#E7FBF8', 100: '#C6F4EE', 300: '#6EE2D2', 400: '#2DD4BF', 500: '#14B8A6', 600: '#0D9488', 700: '#0F766E' },
        lav: { 50: '#F6F4FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA', 600: '#7C5CE0' },
        coral: { 50: '#FFF2EF', 100: '#FFDCD4', 400: '#FF8A73', 500: '#FF5A43', 600: '#E8432C', 700: '#C2321E' },
        amber: { 50: '#FFF8EB', 400: '#FBBF24', 500: '#F59E0B', 700: '#B45309' },
        ink: { DEFAULT: '#101936', soft: '#2E3A5C', muted: '#5F6B8A', faint: '#9AA3BD' },
        line: '#E6E9F2',
      },
      fontFamily: { sans: ['"DM Sans Variable"', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(16,25,54,.04), 0 12px 32px -16px rgba(23,46,140,.22)',
        lift: '0 20px 50px -18px rgba(35,71,217,.45)',
        coral: '0 18px 44px -14px rgba(232,67,44,.6)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
    },
  },
  plugins: [],
} satisfies Config;
