/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        // iPad Split View (50:50) 対応用
        // iPad Pro 11": ~552px / iPad 10.2": ~535px
        'split': '900px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
