/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens — resolve to CSS vars set per theme in index.css.
        // Light is the default (school); .dark on <html> flips them.
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        surface2: 'rgb(var(--c-surface2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        dim: 'rgb(var(--c-dim) / <alpha-value>)',
        // Deep navy surfaces (dark theme base)
        navy: {
          950: '#05070f',
          900: '#080d1c',
          850: '#0b1224',
          800: '#0e1730',
          750: '#132043',
          700: '#1a2a52',
          600: '#25396d',
        },
        // Blue accent scale
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sky: {
          400: '#38bdf8',
          500: '#0ea5e9',
        },
      },
      fontFamily: {
        // Body / UI text, tables, numbers — Inter (self-hosted variable).
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        // Display headings — Brunson (self-hosted), Inter as the fallback.
        display: ['Brunson', '"Inter Variable"', 'Georgia', 'serif'],
        // Eyebrow / kicker labels — Bebas Neue (condensed all-caps).
        // Named `bebas` (not `condensed`) because v3 ships a built-in
        // `font-condensed` utility for the `font-stretch` property, which
        // would otherwise shadow our `font-family` utility and break @apply.
        bebas: ['"Bebas Neue"', '"Inter Variable"', 'sans-serif'],
        // Optional accent (varsity block) — not applied anywhere by default.
        accent: ['"Jersey 716"', '"Inter Variable"', 'sans-serif'],
        // No mono webfont — platform monospace for section codes / raw lines.
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,130,246,0.25), 0 8px 40px -12px rgba(59,130,246,0.45)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)',
        'tech-dots':
          'radial-gradient(#1b263b 1px, transparent 1px), radial-gradient(#1b263b 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
}
