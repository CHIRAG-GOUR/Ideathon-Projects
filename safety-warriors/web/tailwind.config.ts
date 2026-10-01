import type { Config } from 'tailwindcss';

// Safety Warriors — PREPARED. Cream base, teal and emerald energy, deep indigo surfaces,
// soft orange highlights; emergency red only for real emergency actions.
export default {
  content: ['./src/**/*.{ts,tsx}', '../../safety-core/web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#FFF8EC', 100: '#FDF1DC', 200: '#F7E6C8' },
        teal: { 50: '#E5F7F5', 100: '#C2EDE8', 300: '#5ECFC2', 400: '#22B8A7', 500: '#0E9F8E', 600: '#0B7F72', 700: '#0B655B' },
        emerald: { 50: '#E8F8EF', 100: '#C9EFD9', 400: '#34C77B', 500: '#16A660', 600: '#0E8A4E' },
        indigo: { 50: '#EEEDFB', 100: '#DCDAF6', 300: '#9C97E2', 500: '#4B44B8', 600: '#3B3597', 700: '#2E2A6B', 800: '#221F52', 900: '#18163B' },
        tang: { 50: '#FFF1E6', 100: '#FFDFC4', 300: '#FFB781', 400: '#FF9F5A', 500: '#F5823A', 600: '#D9661F' },
        sos: { 50: '#FDECEC', 100: '#F9D0D0', 500: '#E23B3B', 600: '#C42A2A', 700: '#A01F1F' },
        ink: { DEFAULT: '#1B1A33', soft: '#3A3857', muted: '#67657F', faint: '#A3A1B5' },
        line: '#EDE3D1',
      },
      fontFamily: { sans: ['"Inter Variable"', 'system-ui', 'sans-serif'], display: ['"Sora Variable"', '"Inter Variable"', 'sans-serif'] },
      boxShadow: {
        tile: '0 2px 0 rgba(46,42,107,.08), 0 14px 30px -18px rgba(46,42,107,.35)',
        pop: '0 16px 40px -14px rgba(14,159,142,.55)',
        sos: '0 18px 44px -12px rgba(226,59,59,.6)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
} satisfies Config;
