/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Edvexa design system
        canvas: '#000000',
        ink: '#e1d816',
        accent: '#9c9723',
        'ink-soft': '#9c9723',
        'ink-faint': '#9c9723',
        rule: '#605c00',
        surface: '#3c3a05',
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        card: '20px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.5)',
        lift: '0 8px 24px rgba(0, 0, 0, 0.6)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 180ms ease-out both',
      },
    },
  },
  plugins: [],
};
