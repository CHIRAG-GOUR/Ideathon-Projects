/** Smart LPG Dock — LPG blue + cream + graphite; safety orange/red only for real states. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lpg: { 50: '#EEF4FB', 100: '#D7E6F6', 200: '#AFCBEC', 300: '#7FA9DD', 400: '#4F86CB', 500: '#2563B0', 600: '#1D4F91', 700: '#183F73', 800: '#142F55', 900: '#0E2039' },
        cream: { DEFAULT: '#FBF7F0', 100: '#F5EEE2', 200: '#EADFCB', 300: '#DCCBAE' },
        graphite: { DEFAULT: '#1F2733', soft: '#3B4656', muted: '#5E6977', faint: '#98A1AD' },
        steel: { 50: '#F5F7F9', 100: '#EEF1F4', 200: '#DDE2E8', 300: '#C3CAD3', 400: '#9AA4B1', 500: '#6E7987' },
        safety: { 50: '#FFF4E8', 100: '#FFE3C4', 400: '#F99A3D', 500: '#E8730C', 600: '#C25E05', 700: '#9A4A04' },
        ok: { 50: '#E9F7EF', 100: '#CDEEDB', 500: '#1E9A58', 600: '#167A45', 700: '#115E35' },
        danger: { 50: '#FDEDEC', 100: '#FAD3D0', 500: '#D92D20', 600: '#B42318', 700: '#8F1C13' },
        burnt: '#C2410C',
        line: '#E6DFD2',
      },
      fontFamily: { sans: ['"Manrope Variable"', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'] },
      boxShadow: { card: '0 1px 2px rgba(31,39,51,.05), 0 8px 24px -14px rgba(20,47,85,.25)', lift: '0 14px 40px -16px rgba(37,99,176,.45)' },
      borderRadius: { xl2: '1.1rem' },
    },
  },
  plugins: [],
};
