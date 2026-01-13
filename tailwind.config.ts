import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark Mode Colors
        dark: {
          bg: "#0E0E0E",
          primary: "#0047FF", // Neon Cobalt
          secondary: "#2A2A2A", // Tungsten
          surface: "#1A1A1A",
          border: "#333333",
        },
        // Light Mode Colors
        light: {
          bg: "#F5F5F7",
          text: "#050505", // Midnight
          accent: "#FF4800", // Industrial Safety Orange
          surface: "#FFFFFF",
          border: "#E5E5E5",
        },
        // Shared accent colors
        cobalt: "#0047FF",
        orange: "#FF4800",
        tungsten: "#2A2A2A",
      },
      fontFamily: {
        sans: ["Satoshi", "system-ui", "sans-serif"],
        heading: ["General Sans", "system-ui", "sans-serif"],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "slide-up": "slideUp 0.5s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "spin-slow": "spin 8s linear infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-20px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px #0047FF, 0 0 10px #0047FF, 0 0 15px #0047FF" },
          "100%": { boxShadow: "0 0 10px #0047FF, 0 0 20px #0047FF, 0 0 30px #0047FF" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "grid-pattern": "linear-gradient(to right, #2A2A2A 1px, transparent 1px), linear-gradient(to bottom, #2A2A2A 1px, transparent 1px)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
