// client/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa',
          500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        // Safety amber — workshop tools & hazard tape; used sparingly on the landing page
        amberline: { DEFAULT: '#F5B301', soft: '#FFF4CC', ink: '#7A5A00' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Narrow, sign-like headline face for the landing page
        display: ['"Barlow Condensed"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      keyframes: {
        // Parts tray in the hero: each tile bobs gently, offset by animation-delay
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        // Notification bell: a short ring when there are unread notifications
        ring: { '0%, 100%': { transform: 'rotate(0)' }, '15%, 45%': { transform: 'rotate(14deg)' }, '30%, 60%': { transform: 'rotate(-14deg)' }, '75%': { transform: 'rotate(6deg)' } },
      },
      animation: { float: 'float 6s ease-in-out infinite', ring: 'ring 0.9s ease-in-out 1' },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)' },
    },
  },
  plugins: [],
};