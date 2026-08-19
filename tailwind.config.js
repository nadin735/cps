/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--bg-app)',
        surface2: 'var(--bg-panel)',
        edge: 'var(--border)',
        ink: 'var(--text)',
        ink2: 'var(--text-dim)',
        ink3: 'var(--text-faint)',
        field: 'var(--field-bg)',
        fieldEdge: 'var(--field-border)',
        inkOnGold: '#171614',
        gold: {
          300: '#F0DA92',
          400: '#E8C766',
          500: '#D4AF37',
          600: '#A8842A',
        },
        silver: {
          300: '#E7E7E3',
          400: '#C6C6C1',
          500: '#9C9C96',
          600: '#75756E',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        arabic: ['"Tajawal"', 'sans-serif'],
      },
      boxShadow: {
        panel: 'var(--panel-shadow)',
      },
    },
  },
  plugins: [],
}
