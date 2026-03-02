/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          500: '#10b981',
          700: '#047857'
        }
      },
      boxShadow: {
        soft: '0 12px 30px -16px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};
