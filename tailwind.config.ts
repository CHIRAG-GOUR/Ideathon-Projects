import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FBF9F5",
        foreground: "#1A2421",
        cream: {
          50: "#FCFAF6",
          100: "#F8F4EC",
          200: "#F2EADB",
          300: "#E7DCBF",
          400: "#D8C79D",
          500: "#C4AF7B",
        },
        grocery: {
          50: "#F2F8F4",
          100: "#E3F1E7",
          200: "#C5E3CE",
          300: "#97CEA9",
          400: "#52B788",
          500: "#2D6A4F",
          600: "#1B4D3E",
          700: "#143D32",
          800: "#0F2E26",
          900: "#0A201A",
        },
        cardboard: {
          50: "#FAF7F2",
          100: "#F3ECE1",
          200: "#E5D7C2",
          300: "#D3BE9E",
          400: "#BFA37B",
          500: "#A28359",
          600: "#856641",
          700: "#694D31",
        },
        tomato: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#E63946",
          600: "#DC2626",
          700: "#B91C1C",
        },
        mango: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "Plus Jakarta Sans", "sans-serif"],
        display: ["var(--font-display)", "Outfit", "Plus Jakarta Sans", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        'warm-sm': '0 1px 2px 0 rgba(40, 30, 20, 0.05)',
        'warm-md': '0 4px 12px -2px rgba(40, 30, 20, 0.06), 0 2px 4px -1px rgba(40, 30, 20, 0.03)',
        'warm-lg': '0 12px 24px -4px rgba(40, 30, 20, 0.08), 0 4px 8px -2px rgba(40, 30, 20, 0.04)',
        'warm-xl': '0 20px 32px -6px rgba(40, 30, 20, 0.1), 0 8px 16px -4px rgba(40, 30, 20, 0.06)',
        'grocery-glow': '0 0 20px -3px rgba(45, 106, 79, 0.25)',
        'tomato-glow': '0 0 20px -3px rgba(230, 57, 70, 0.25)',
      },
      borderRadius: {
        'grocery': '16px',
        'shelf': '20px',
      },
      keyframes: {
        'scan-line': {
          '0%, 100%': { transform: 'translateY(0%)' },
          '50%': { transform: 'translateY(100%)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'scan-line': 'scan-line 2s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2.5s ease-in-out infinite',
        'float-gentle': 'float-gentle 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
