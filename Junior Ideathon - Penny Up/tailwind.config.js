/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Chirag UI Maker - 2-3 Color Light Palette
        // 1. Fresh Emerald / Leaf Green (Savings, money growth, deposits)
        brand: {
          DEFAULT: '#059669',
          dark: '#047857',
          light: '#10B981',
          soft: '#ECFDF5',
          border: '#A7F3D0',
          glow: '#34D399'
        },
        // 2. Sunny Warm Amber Gold (Coins, stars, milestones, badges)
        coin: {
          DEFAULT: '#D97706',
          dark: '#B45309',
          light: '#F59E0B',
          bright: '#FBBF24',
          soft: '#FEF3C7',
          border: '#FDE68A'
        },
        // 3. Canvas & Slate Ink (Crisp cloud white, clean card backgrounds, high-contrast dark slate text)
        cloud: {
          50: '#FFFFFF',
          100: '#F8FAFC',
          200: '#F1F5F9',
          300: '#E2E8F0',
          400: '#CBD5E1'
        },
        ink: {
          DEFAULT: '#0F172A',
          soft: '#1E293B',
          muted: '#475569',
          faint: '#64748B',
          border: '#E2E8F0'
        },
        // Soft Utility Sky for sync status & info tags
        skysoft: {
          DEFAULT: '#0284C7',
          soft: '#F0F9FF',
          border: '#BAE6FD'
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'xs': '0 1px 2px rgba(15, 23, 42, 0.05)',
        'soft': '0 8px 28px rgba(5, 150, 105, 0.08)',
        'card': '0 2px 14px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 12px 32px rgba(15, 23, 42, 0.08)',
        'float': '0 16px 40px rgba(15, 23, 42, 0.10)',
        'glow-brand': '0 0 24px rgba(16, 185, 129, 0.25)',
        'glow-coin': '0 0 24px rgba(245, 158, 11, 0.25)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
