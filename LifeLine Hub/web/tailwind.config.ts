import type { Config } from 'tailwindcss';

// LifeLine Hub — the colours of care. Hospital green (the brand, safety, "ready"), ambulance white and red
// (red only when something is urgent: an active SOS, a critical warning), medical-signage blue for live data,
// violet for AI. Light, clinical surfaces throughout. (Names kept stable: teal = hospital green,
// coral = ambulance red, cyan = signage blue.)
export default {
  content: ['./src/**/*.{ts,tsx}', '../../safety-core/web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        clinic: { 50: '#F5FAF7', 100: '#EBF4EF', 200: '#DCEAE2', 300: '#C4D8CD' },
        midnight: { 950: '#050B16', 900: '#081325', 800: '#0D1C33', 700: '#152946', 600: '#203A5E', 500: '#34507A', 400: '#5C7393', 300: '#8DA0BA', 200: '#B9C6D6' },
        teal: { 50: '#E9F7EF', 100: '#CDEEDC', 200: '#9FDBBD', 300: '#62C294', 400: '#27A36C', 500: '#0B8A57', 600: '#087247', 700: '#075A39', 800: '#06452C' },
        cyan: { 50: '#EAF3FC', 100: '#D3E6F8', 200: '#AECFF1', 300: '#7CB2E6', 400: '#3F8DD8', 500: '#1F70C4', 600: '#185AA2', 700: '#134781' },
        coral: { 50: '#FFF0F0', 100: '#FFDDDE', 200: '#FFB7BA', 300: '#FF8088', 400: '#F04852', 500: '#DA1E2C', 600: '#B71420', 700: '#8F0F18', 800: '#5E0A10' },
        vital: { 50: '#EAF7F0', 100: '#CDEEDC', 300: '#7ED3A6', 400: '#3DBB7E', 500: '#23A06A', 600: '#1A7F54' },
        amber: { 50: '#FFF6E5', 100: '#FFE9BF', 300: '#F9CD72', 400: '#F5B544', 500: '#E89A16', 600: '#B97508', 700: '#8A5606' },
        violet: { 50: '#F1EFFE', 100: '#E3DFFD', 200: '#C9C1FB', 300: '#ADA2F7', 400: '#8C7CF3', 500: '#6E5BEA', 600: '#5643C9', 700: '#41329A' },
        ink: { DEFAULT: '#0E1B17', soft: '#2C3D37', muted: '#5A6B65', faint: '#93A39D' },
        line: '#DCE8E1',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk Variable"', '"Inter Variable"', 'sans-serif'],
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(14,27,23,.04), 0 12px 32px -20px rgba(14,27,23,.22)',
        lift: '0 24px 60px -30px rgba(14,27,23,.35)',
        glow: '0 0 0 1px rgba(11,138,87,.18), 0 10px 40px -12px rgba(11,138,87,.35)',
        coral: '0 18px 44px -14px rgba(218,30,44,.55)',
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
