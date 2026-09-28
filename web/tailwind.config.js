/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "var(--color-page)",
        ink: {
          50: "var(--color-ink-50)",
          100: "var(--color-ink-100)",
          200: "var(--color-ink-200)",
          300: "var(--color-ink-300)",
          400: "var(--color-ink-400)",
          500: "var(--color-ink-500)",
          600: "var(--color-ink-600)",
          700: "var(--color-ink-700)",
          800: "var(--color-ink-800)",
          900: "var(--color-ink-900)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          elevated: "var(--color-surface-elevated)",
          sunken: "var(--color-surface-sunken)",
        },
        paper: {
          50: "var(--color-paper-50)",
          100: "var(--color-paper-100)",
          200: "var(--color-paper-200)",
          300: "var(--color-paper-300)",
          400: "var(--color-paper-400)",
          500: "var(--color-paper-500)",
        },
        edge: {
          DEFAULT: "var(--color-edge)",
          strong: "var(--color-edge-strong)",
        },
        running: {
          DEFAULT: "#3dcd58",
          text: "#5eda76",
          bg: "#0f2a17",
          border: "#1e5a2c",
        },
        ready: {
          DEFAULT: "#ffb020",
          text: "#ffc043",
          bg: "#2a1e08",
          border: "#5a4014",
        },
        broken: {
          DEFAULT: "#e53935",
          text: "#ff6b7a",
          bg: "#2a1013",
          border: "#5a1c22",
        },
        info: {
          DEFAULT: "#4fc3f7",
          text: "#6bcefa",
          bg: "#0c2130",
          border: "#1f4a68",
        },
      },
      fontFamily: {
        display: ["'Chakra Petch'", "'Chakra Petch Fallback'", "sans-serif"],
        body: ["'IBM Plex Sans Condensed'", "'IBM Plex Sans Condensed Fallback'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'JetBrains Mono Fallback'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        "panel-lg": "var(--shadow-panel-lg)",
        header: "var(--shadow-header)",
      },
    },
  },
  plugins: [],
};
