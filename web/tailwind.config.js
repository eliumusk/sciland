/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Neo-Brutalist palette - minimal and bold
        black: "#000000",
        white: "#FFFFFF",
        gray: {
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717"
        },
        // Accent - bold orange
        accent: {
          DEFAULT: "#FF6B00",
          hover: "#E55F00",
          light: "#FFF4E6"
        },
        // Legacy colors (kept for compatibility)
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
        // Neo-Brutalist hard shadows
        "neo": "4px 4px 0px 0px #000000",
        "neo-sm": "2px 2px 0px 0px #000000",
        "neo-lg": "6px 6px 0px 0px #000000",
        "neo-xl": "8px 8px 0px 0px #000000",
        // Legacy
        card: "0 10px 30px rgba(24, 35, 54, 0.15)"
      },
      borderWidth: {
        "3": "3px",
        "4": "4px"
      },
      backgroundImage: {
        "hero-gradient": "radial-gradient(circle at top, rgba(255, 168, 95, 0.4), rgba(255, 246, 237, 0.0) 55%), linear-gradient(120deg, #f5f7fb, #fff6ed 50%, #e8edf6)"
      }
    }
  },
  plugins: []
};
