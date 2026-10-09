import type { Config } from 'tailwindcss';

/** Light-only palette: warm white, light gray, road green, safety amber, pothole red, graphite, GPS blue. */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: { DEFAULT: '#FAF8F4', 50: '#FFFEFB', 100: '#F6F3EE', 200: '#EDE9E2', 300: '#DEDAD2' },
        road: { 50: '#EEF7F1', 100: '#D6EEDF', 200: '#AEDDBF', 400: '#4DB27A', 500: '#2F9A5E', 600: '#23804C', 700: '#1C653D' },
        amber: { 50: '#FFF8E8', 100: '#FEEDC2', 300: '#FBC957', 400: '#F6B02A', 500: '#E59A0B', 700: '#8A5A06' },
        pothole: { 50: '#FFF1F1', 100: '#FFDEDE', 300: '#F7A1A3', 400: '#EF6B6F', 500: '#E5484D', 600: '#C73438', 700: '#8F2226' },
        gps: { 50: '#EEF4FF', 100: '#DCE8FF', 300: '#9DBFFB', 500: '#4C8DF6', 600: '#2F6FDB' },
        graphite: { DEFAULT: '#2B2F33', soft: '#4A5057', muted: '#747B83', faint: '#A7ADB3' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(43,47,51,0.05), 0 8px 24px -12px rgba(43,47,51,0.18)',
        lift: '0 2px 4px rgba(43,47,51,0.06), 0 24px 48px -20px rgba(43,47,51,0.3)',
      },
      borderRadius: { '4xl': '2rem' },
      keyframes: {
        sweep: { '0%': { top: '8%' }, '50%': { top: '88%' }, '100%': { top: '8%' } },
        dash: { to: { strokeDashoffset: '-40' } },
      },
      animation: { sweep: 'sweep 2.4s ease-in-out infinite', dash: 'dash 1s linear infinite' },
    },
  },
  plugins: [],
};
export default config;
