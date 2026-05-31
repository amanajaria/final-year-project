/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f4ff',
          100: '#e0eaff',
          200: '#c7d7fd',
          300: '#a5bbfc',
          400: '#8196f8',
          500: '#6270f1',
          600: '#4f52e5',
          700: '#4140ca',
          800: '#3636a4',
          900: '#313282',
        },
        surface: {
          900: '#0f0f1a',
          800: '#16162b',
          700: '#1e1e38',
          600: '#252545',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #6270f1 0%, #a855f7 50%, #ec4899 100%)',
      },
      animation: {
        'fade-in':    'fadeIn 0.4s ease-out both',
        'slide-up':   'slideUp 0.4s ease-out both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float':      'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        float:   { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
      },
    },
  },
  plugins: [],
}
