/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand warm sand palette (used for accents)
        sand: {
          50: '#fbf9f6',
          100: '#f5f0e8',
          200: '#ebdccb',
          300: '#ddc2a7',
          400: '#cba380',
          500: '#bd8b63',
          600: '#a8734e',
          700: '#8c5a3d',
          800: '#724935',
          900: '#5e3d2e',
        },
        // Extra stone shades extending Tailwind defaults (stone-850 is not in Tailwind core)
        stone: {
          850: '#1f1b18',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
