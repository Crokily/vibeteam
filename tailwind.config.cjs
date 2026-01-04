/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './electron/renderer/index.html',
    './electron/renderer/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        slate: 'rgb(var(--color-slate) / <alpha-value>)',
        graphite: 'rgb(var(--color-graphite) / <alpha-value>)',
        ash: 'rgb(var(--color-ash) / <alpha-value>)',
        iron: 'rgb(var(--color-iron) / <alpha-value>)',
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--color-accent-soft) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
};
