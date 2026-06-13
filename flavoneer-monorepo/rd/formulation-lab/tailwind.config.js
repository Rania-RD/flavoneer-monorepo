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
        sans: ["Inter", "Tajawal", "IBM Plex Sans Arabic", "sans-serif"],
      },
      colors: {
        "vivid-pink": "#F48FB1",
        "vivid-blue": "#90CAF9",
        "vivid-yellow": "#FFF59D",
        "baby-pink": "#FFF5F7",
        charcoal: "#1A1A1A",
        "action-pink": "#FF4081",
      },
    },
  },
  plugins: [],
};
