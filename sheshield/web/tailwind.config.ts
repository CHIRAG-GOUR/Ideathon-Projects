import type { Config } from 'tailwindcss';

// She Shield — PROTECTIVE. Pearl and deep violet everyday; red is reserved for an active emergency.
export default {
  content: ['./src/**/*.{ts,tsx}', '../../safety-core/web/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pearl: { DEFAULT: '#FBF9FE', 100: '#F5F1FC', 200: '#ECE5F8' },
        violet: { 50: '#F4F0FF', 100: '#E9E1FF', 200: '#D4C5FE', 300: '#B8A0FA', 400: '#9B7BF2', 500: '#7C4DDB', 600: '#6236C2', 700: '#4C2A9B', 800: '#3B1E77', 900: '#26124F' },
        plum: { 400: '#A855F7', 500: '#8E2DE2', 600: '#7417C6' },
        rose: { 100: '#FBE4EC', 300: '#F0B3C6', 400: '#E58FA8', 500: '#D96A8C' },
        shield: { 100: '#DCE8FF', 400: '#6EA0F7', 500: '#3B82F6', 600: '#2563EB' },
        mint: { 50: '#E8FAF3', 500: '#2FBF8F', 600: '#1F9E74' },
        alert: { 50: '#FFF0F0', 500: '#E5383B', 600: '#C9262A', 700: '#A11D21' },
        ink: { DEFAULT: '#1E1533', soft: '#3E3456', muted: '#6E6585', faint: '#A69FB8' },
        line: '#E8E2F2',
      },
      fontFamily: { sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 2px rgba(30,21,51,.04), 0 10px 30px -12px rgba(59,30,119,.16)',
        glow: '0 18px 50px -14px rgba(124,77,219,.55)',
        alert: '0 18px 50px -12px rgba(229,56,59,.55)',
      },
      borderRadius: { xl2: '1.25rem', '4xl': '2rem' },
    },
  },
  plugins: [],
} satisfies Config;
