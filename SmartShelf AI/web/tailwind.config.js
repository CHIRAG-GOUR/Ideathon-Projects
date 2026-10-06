/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: v('smart-cream'), deep: v('smart-cream-deep') },
        surface: { DEFAULT: v('smart-surface'), dark: v('smart-surface-dark') },
        line: { DEFAULT: v('smart-border'), strong: v('smart-border-strong') },
        ink: { DEFAULT: v('smart-text'), 2: v('smart-text-2'), muted: v('smart-muted'), faint: v('smart-faint') },
        green: { DEFAULT: v('smart-green'), mid: v('smart-green-mid'), dark: v('smart-green-dark'), deep: v('smart-green-deep'), mint: v('smart-mint') },
        red: { DEFAULT: v('smart-red'), soft: v('smart-red-soft'), ink: v('smart-danger') },
        yellow: { DEFAULT: v('smart-yellow'), soft: v('smart-yellow-soft'), ink: v('smart-warning') },
        orange: { DEFAULT: v('smart-orange'), soft: v('smart-orange-soft') },
        ok: { bg: v('smart-mint'), fg: v('smart-success'), dot: v('smart-success') },
        warn: { bg: v('smart-yellow-soft'), fg: v('smart-warning'), dot: v('smart-yellow') },
        risk: { bg: v('smart-red-soft'), fg: v('smart-danger'), dot: v('smart-red') },
        hold: { bg: v('smart-hold-soft'), fg: v('smart-hold'), dot: v('smart-hold') },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgb(var(--smart-border-strong) / 0.6), 0 2px 6px -2px rgb(var(--smart-text) / 0.06)',
        lift: '0 18px 40px -18px rgb(var(--smart-green-deep) / 0.35), 0 4px 10px -4px rgb(var(--smart-text) / 0.08)',
        sheet: '0 -12px 40px rgb(var(--smart-text) / 0.2)',
        shelf: '0 10px 0 -6px rgb(var(--smart-cream-deep)), 0 14px 22px -14px rgb(var(--smart-text) / 0.25)',
        inset: 'inset 0 -3px 0 rgb(var(--smart-text) / 0.08)',
      },
      borderRadius: { xl2: '14px', xl3: '20px', xl4: '28px' },
    },
  },
  plugins: [],
};
