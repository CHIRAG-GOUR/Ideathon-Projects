/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FAF8F4',
        surface: '#FFFFFF',
        lavender: {
          light: '#F3F0FF',
          DEFAULT: '#E9E4FF',
          dark: '#D0C6FF'
        },
        mint: {
          light: '#EEFAF3',
          DEFAULT: '#DDF3E7',
          dark: '#BDE8D0'
        },
        coral: {
          light: '#FFEAE6',
          DEFAULT: '#FF8978',
          hover: '#FA7360',
          dark: '#E85B46'
        },
        plum: {
          DEFAULT: '#29243B',
          soft: '#4A4363',
          muted: '#777484',
          faint: '#A5A2B3'
        },
        teal: {
          light: '#E6F4F2',
          DEFAULT: '#398C83',
          dark: '#2A6B64'
        },
        yellow: {
          highlight: '#FFF0C7',
          warm: '#FCE7A4'
        },
        border: {
          light: '#EAE6EE',
          subtle: '#F2EFF6'
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
        editorial: ['"Manrope"', '"Plus Jakarta Sans"', 'sans-serif']
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px'
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(41, 36, 59, 0.05)',
        'float': '0 12px 36px -4px rgba(41, 36, 59, 0.08)',
        'card': '0 2px 12px rgba(41, 36, 59, 0.03)'
      }
    },
  },
  plugins: [],
}
