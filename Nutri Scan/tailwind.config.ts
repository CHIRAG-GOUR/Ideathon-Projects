import type { Config } from 'tailwindcss';

/**
 * "Juice bar" light palette — deliberately different from Visionary X's cream + forest green.
 * Cloud-white base, aqua primary, lilac + sky accents, lemon for "use soon", coral for urgent,
 * peach for warm wood/pantry. No dark surfaces; ink is only used for readable text.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cloud: { 50: '#FCFDFF', 100: '#F5F8FE', 200: '#ECF1FA', 300: '#DEE5F2', 400: '#C8D1E4' },
        aqua: { 50: '#EEFCF9', 100: '#D5F7F0', 200: '#ABEFE2', 300: '#7EE4D3', 400: '#4FD3BF', 500: '#26B9A5', 600: '#189B8A', 700: '#137B6F', 800: '#105F57', 900: '#0C4841' },
        lilac: { 50: '#F7F4FF', 100: '#EFE9FF', 200: '#DED3FF', 300: '#C5B4FF', 400: '#A78FF8', 500: '#8769E8' },
        lemon: { 50: '#FFFCEB', 100: '#FFF6C9', 200: '#FFEC92', 300: '#FFDE5A', 400: '#FACD2C', 500: '#E1AF0B', 600: '#B38905', 700: '#826405' },
        coral: { 50: '#FFF4F2', 100: '#FFE4E0', 200: '#FFC9C2', 300: '#FFA59B', 400: '#FF7E72', 500: '#F25E52', 600: '#D0463D', 700: '#9C3029' },
        peach: { 100: '#FFF0E6', 200: '#FFDDC8', 300: '#FFC4A2', 400: '#F7A67B', 500: '#E58A58', 600: '#BC6A3E' },
        ink: { DEFAULT: '#2A3148', soft: '#4B5470', muted: '#737C97', faint: '#A8AFC4' },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(62, 72, 120, 0.05), 0 6px 18px -8px rgba(62, 72, 120, 0.14)',
        lift: '0 2px 4px rgba(62, 72, 120, 0.05), 0 20px 40px -18px rgba(62, 72, 120, 0.26)',
        glow: '0 0 0 4px rgba(79, 211, 191, 0.28), 0 0 32px rgba(79, 211, 191, 0.5)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      keyframes: {
        sweep: { '0%': { top: '10%' }, '50%': { top: '86%' }, '100%': { top: '10%' } },
        'soft-pulse': { '0%,100%': { boxShadow: '0 0 0 0 rgba(225,75,52,0.35)' }, '50%': { boxShadow: '0 0 0 7px rgba(225,75,52,0)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        beam: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
      },
      animation: {
        sweep: 'sweep 2.2s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 2.2s ease-in-out infinite',
        marquee: 'marquee 38s linear infinite',
        beam: 'beam 1.6s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};

export default config;
