import type { Config } from 'tailwindcss';

// LifeLine Hub — futuristic medical technology. Calm by default (clinical off-white, deep midnight, medical teal,
// electric cyan for live data, violet for AI); coral appears only when something is urgent: an active SOS, a
// critical warning, a response that needs attention.
export default {
  content: ['./src/**/*.{ts,tsx}', '../../safety-core/web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clinic: { 50: '#F7FAFB', 100: '#EEF3F6', 200: '#E1E9EE', 300: '#CCD8E0' },
        midnight: { 950: '#050B16', 900: '#081325', 800: '#0D1C33', 700: '#152946', 600: '#203A5E', 500: '#34507A', 400: '#5C7393', 300: '#8DA0BA', 200: '#B9C6D6' },
        teal: { 50: '#E6F7F6', 100: '#C7EEEC', 200: '#9DE2DE', 300: '#5FD0C9', 400: '#22B8B0', 500: '#0E9F9A', 600: '#0B7F7B', 700: '#095F5C' },
        cyan: { 200: '#B5F1FB', 300: '#7DE7FA', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2' },
        coral: { 50: '#FFF1F1', 100: '#FFE0E0', 200: '#FFC2C5', 300: '#FF8C93', 400: '#FF5A64', 500: '#F0384A', 600: '#D02035', 700: '#A3162A', 800: '#6E0F1D' },
        vital: { 50: '#EAF7F0', 100: '#CDEEDC', 300: '#7ED3A6', 400: '#3DBB7E', 500: '#23A06A', 600: '#1A7F54' },
        amber: { 50: '#FFF6E5', 100: '#FFE9BF', 300: '#F9CD72', 400: '#F5B544', 500: '#E89A16', 600: '#B97508', 700: '#8A5606' },
        violet: { 50: '#F1EFFE', 100: '#E3DFFD', 200: '#C9C1FB', 300: '#ADA2F7', 400: '#8C7CF3', 500: '#6E5BEA', 600: '#5643C9', 700: '#41329A' },
        ink: { DEFAULT: '#0B1626', soft: '#2B3B52', muted: '#5B6B80', faint: '#9AA8B8' },
        line: '#DCE5EC',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk Variable"', '"Inter Variable"', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(11,22,38,.04), 0 12px 32px -18px rgba(11,22,38,.28)',
        lift: '0 24px 60px -28px rgba(8,19,37,.45)',
        glow: '0 0 0 1px rgba(34,211,238,.25), 0 10px 40px -10px rgba(34,211,238,.45)',
        coral: '0 18px 50px -14px rgba(240,56,74,.6)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.08)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        drift: { '0%,100%': { transform: 'translate3d(0,0,0)' }, '50%': { transform: 'translate3d(0,-12px,0)' } },
        flow: { to: { strokeDashoffset: '-40' } },
      },
      animation: { shimmer: 'shimmer 1.6s linear infinite', drift: 'drift 14s ease-in-out infinite', flow: 'flow 1.6s linear infinite' },
    },
  },
  plugins: [],
} satisfies Config;
