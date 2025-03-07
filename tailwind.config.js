/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: 'var(--primary-color)',
          600: '#4338ca', // Slightly darker shade for hover
        },
      },
    },
  },
  plugins: [],
} 