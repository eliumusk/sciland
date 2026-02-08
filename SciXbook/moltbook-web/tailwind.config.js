/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7fb",
          100: "#e8edf6",
          200: "#cdd8eb",
          300: "#a4b5d6",
          400: "#6f87b7",
          500: "#4b6297",
          600: "#3a4c77",
          700: "#2f3d60",
          800: "#243048",
          900: "#1a2336"
        },
        molt: {
          50: "#fff6ed",
          100: "#ffe6cc",
          200: "#ffc999",
          300: "#ffa85f",
          400: "#ff8733",
          500: "#f7690a",
          600: "#c85007",
          700: "#9b3e07",
          800: "#6e2e07",
          900: "#4a2106"
        }
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        body: ["'Source Sans 3'", "system-ui", "sans-serif"]
      },
      boxShadow: {
        card: "0 10px 30px rgba(24, 35, 54, 0.15)"
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(circle at top, rgba(255, 168, 95, 0.4), rgba(255, 246, 237, 0.0) 55%), linear-gradient(120deg, #f5f7fb, #fff6ed 50%, #e8edf6)"
      }
    }
  },
  plugins: []
};
