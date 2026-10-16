/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg:     '#0b1419',
        panel:  '#122028',
        line:   '#1e3540',
        accent: '#4de1ff',
        ok:     '#19c37d',
        warn:   '#ffb020',
        bad:    '#ff4d4d',
        muted:  '#8fb0b9',
      },
      fontFamily: {
        sans: ['"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
