import type { Config } from 'tailwindcss';

// Red & white: calm white/rose for everyday screens, strong red reserved for SOS.
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFFBFB',
        blush: { 50: '#FFF5F6', 100: '#FFE9EC', 200: '#FFD3DA' },
        sos: { 50: '#FFF1F3', 100: '#FFE0E6', 200: '#FFC2CE', 300: '#FF93A8', 400: '#FF5577', 500: '#F02452', 600: '#D5103F', 700: '#AF0B33', 800: '#8A0C2C', 900: '#5C0A1E' },
        ink: { DEFAULT: '#2A1519', soft: '#4A3337', muted: '#7C6468', faint: '#B3A1A4' },
        line: '#F2DFE3',
        safe: { 50: '#E9F8F1', 500: '#13A36E', 600: '#0E8A5C' },
        warn: { 50: '#FFF6E5', 500: '#E0900F', 600: '#B87408' },
        plum: '#5B2A4A',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgba(42,21,25,.04), 0 8px 24px -8px rgba(42,21,25,.10)',
        glow: '0 20px 60px -12px rgba(240,36,82,.55)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
} satisfies Config;
