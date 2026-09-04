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
        // Everything readable — body copy, headings, tables, numbers — is Inter
        // (self-hosted variable). Headings just use a heavier weight + tighter
        // tracking; see the h1–h4 rule in index.css.
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        body: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        display: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        // Eyebrow / kicker labels only — Bebas Neue (condensed all-caps).
        bebas: ['"Bebas Neue"', '"Inter Variable"', 'sans-serif'],
        // Available brand display faces — apply explicitly where wanted
        // (font-brunson / font-jersey). Not used by default: as headline fonts
        // they read heavy/rough for a finance page.
        brunson: ['Brunson', '"Inter Variable"', 'Georgia', 'serif'],
        jersey: ['"Jersey 716"', '"Inter Variable"', 'sans-serif'],
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
