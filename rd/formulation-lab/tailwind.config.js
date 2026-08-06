// @type {import('tailwindcss').Config}
export default {
  content: [
    "./index.html",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./context/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Tajawal", "IBM Plex Sans Arabic", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        "flavoneer-forest": "#1C4A3C",
        "flavoneer-deep": "#102F27",
        "flavoneer-mint": "#D2F2D4",
        "flavoneer-cream": "#FFFDF4",
        "flavoneer-amber": "#F5A623",
        "flavoneer-orange": "#FF7738",
        "brand-primary": "#1C4A3C",
        "brand-primary-hover": "#102F27",
        "brand-deep": "#102F27",
        "brand-mint": "#D2F2D4",
        "brand-canvas": "#EEF8EB",
        "brand-cream": "#FFFDF4",
        "brand-accent": "#F5A623",
        "brand-accent-hover": "#FFC760",
        "brand-focus": "#FF7738",
        "vivid-pink": "#F48FB1",
        "vivid-yellow": "#FFF59D",
        "baby-pink": "#FFF5F7",
        charcoal: "#1A1A1A",
        "action-pink": "#FF4081",
      },
    },
  },
  plugins: [],
};
