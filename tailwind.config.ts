import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'selector',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    // Explicitly exclude build artifacts to prevent stale class scanning
    "!./.netlify/**",
    "!./.next/**",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        overlay: "var(--bg-overlay)",
        input: "var(--bg-input)",
        primary: "var(--gold-base)",
        "primary-bright": "var(--gold-bright)",
        "primary-muted": "var(--gold-muted)",
        foreground: "var(--text-primary)",
        muted: "var(--text-secondary)",
        tertiary: "var(--text-tertiary)",
        accent: "var(--text-accent)",
        "status-new": "var(--status-new)",
        "status-progress": "var(--status-progress)",
        "status-closed": "var(--status-closed)",
        "status-warn": "var(--status-warn)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        heading: ["var(--font-dm-serif)", "serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        headline: ["var(--font-dm-serif)", "serif"],
        label: ["var(--font-dm-sans)", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
