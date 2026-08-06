/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream: '#FFFDF4',
        forest: '#1C4A3C',
        mint: '#D2F2D4',
        'mint-soft': '#EEF8EB',
      },
      fontFamily: {
        display: ['Fraunces_800ExtraBold'],
        sans: ['DMSans_500Medium'],
      },
    },
  },
  plugins: [],
};
