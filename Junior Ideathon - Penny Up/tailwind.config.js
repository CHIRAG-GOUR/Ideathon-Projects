/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Chirag UI Maker - Fresh Kid-Friendly Palette
        cloud: {
          50: '#FBFDFF',
          100: '#F4F7FC',
          200: '#EAF0F9',
          300: '#DDE5F2'
        },
        pup: {
          DEFAULT: '#7C3AED',
          deep: '#5B21B6',
          light: '#8B5CF6',
          soft: '#F3E8FF',
          glow: '#C084FC'
        },
        mint: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#34D399',
          soft: '#ECFDF5',
          border: '#A7F3D0'
        },
        ambercoin: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          light: '#FBBF24',
          soft: '#FEF3C7',
          glow: '#FDE68A'
        },
        coralberry: {
          DEFAULT: '#F43F5E',
          dark: '#E11D48',
          light: '#FB7185',
          soft: '#FFF1F2'
        },
        skybright: {
          DEFAULT: '#0284C7',
          dark: '#0369A1',
          light: '#38BDF8',
          soft: '#F0F9FF'
        },
        ink: {
          DEFAULT: '#1E1B4B',
          soft: '#332D68',
          muted: '#64748B',
          faint: '#94A3B8'
        }
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 8px 30px rgba(124, 58, 237, 0.08)',
        'card': '0 4px 20px rgba(30, 27, 75, 0.04)',
        'float': '0 12px 36px rgba(124, 58, 237, 0.12)',
        'glow-pup': '0 0 24px rgba(124, 58, 237, 0.35)',
        'glow-mint': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Outfit', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
