import type { Config } from 'tailwindcss';

/**
 * Visionary X design tokens — a light, fresh grocery palette.
 * cream (paper/background) · leaf (brand green) · mango · tomato · sky · soil (wood/cardboard) · ink (text)
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFFBF3',
        foreground: '#26312A',
        ink: {
          DEFAULT: '#26312A',
          soft: '#4B574F',
          muted: '#77817A',
          faint: '#A3AAA3',
        },
        cream: {
          50: '#FFFDF8',
          100: '#FFF8EC',
          200: '#F8EEDB',
          300: '#EFE1C6',
          400: '#E2CFA9',
          500: '#CDB488',
        },
        leaf: {
          50: '#F1F8F1',
          100: '#E1F2E4',
          200: '#C3E4C9',
          300: '#96CFA3',
          400: '#5DB277',
          500: '#2F8F55',
          600: '#237645',
          700: '#1C5E38',
          800: '#16482C',
          900: '#103621',
        },
        mango: {
          50: '#FFF9EA',
          100: '#FDF1D3',
          200: '#FBE1A2',
          300: '#F8CB63',
          400: '#F5B633',
          500: '#F2A516',
          600: '#D1850A',
          700: '#9C5F06',
        },
        tomato: {
          50: '#FFF3EF',
          100: '#FDE6DF',
          200: '#FAC8B9',
          300: '#F4A08A',
          400: '#EC7757',
          500: '#E4572E',
          600: '#C84420',
          700: '#8F2A12',
        },
        sky: {
          50: '#F2F8FD',
          100: '#E2F0FA',
          200: '#C4E0F4',
          300: '#95C8EA',
          400: '#63ABDC',
          500: '#3F8FC7',
        },
        soil: {
          50: '#FAF5EE',
          100: '#F2E7D6',
          200: '#E6D0B0',
          300: '#D6B587',
          400: '#C4985F',
          500: '#A97C47',
          600: '#8A6237',
          700: '#6B4B2B',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(74, 56, 30, 0.05), 0 4px 14px -4px rgba(74, 56, 30, 0.08)',
        lift: '0 2px 4px rgba(74, 56, 30, 0.05), 0 18px 40px -14px rgba(74, 56, 30, 0.18)',
        float: '0 30px 60px -24px rgba(74, 56, 30, 0.28)',
        'inset-line': 'inset 0 0 0 1px rgba(74, 56, 30, 0.08)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        'scan-sweep': {
          '0%': { top: '8%' },
          '50%': { top: '88%' },
          '100%': { top: '8%' },
        },
        'soft-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(228, 87, 46, 0.35)' },
          '50%': { boxShadow: '0 0 0 8px rgba(228, 87, 46, 0)' },
        },
      },
      animation: {
        'scan-sweep': 'scan-sweep 2.4s ease-in-out infinite',
        'soft-pulse': 'soft-pulse 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
