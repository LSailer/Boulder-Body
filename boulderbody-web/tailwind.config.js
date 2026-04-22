/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        chalk: '#F5F0E8',
        paper: '#FDFBF6',
        basalt: '#2A241F',
        ink: '#1F1A17',
        rust: '#C85A2E',
        rustdark: '#A8461F',
        gold: '#E8A93C',
        moss: '#4A5D3A',
        clay: '#8B6F47',
        graphite: '#6B6B6B',
        line: '#E3DCCF',
      },
      boxShadow: {
        pebble:
          '0 1px 0 rgba(31,26,23,0.04), 0 8px 24px -12px rgba(31,26,23,0.18)',
        glow: '0 0 0 4px rgba(232,169,60,0.18)',
        pressed: 'inset 0 2px 4px rgba(31,26,23,0.08)',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { transform: 'rotate(-2deg) scale(1)' },
          '50%': { transform: 'rotate(2deg) scale(1.05)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        flicker: 'flicker 2.2s ease-in-out infinite',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
