/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slatepro: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          'surface-solid': 'var(--surface-solid)',
          border: 'var(--border)',
          'border-hover': 'var(--border-hover)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          accent: 'var(--accent)',
        },
        // Alias aurora namespace to slatepro tokens for backwards-compatibility
        aurora: {
          bg: 'var(--bg)',
          text: 'var(--text)',
          muted: 'var(--muted)',
          glass: 'var(--surface)',
          border: 'var(--border)',
          accent: 'var(--accent)',
          indigo: 'var(--accent)',
          violet: 'var(--accent)',
          cyan: 'var(--accent)',
        },
        status: {
          allow: 'var(--status-allow)',
          warn: 'var(--status-warn)',
          block: 'var(--status-block)',
        }
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Inter"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'subtle': 'var(--glass-shadow)',
        'card-rest': '0 1px 2px rgba(0, 0, 0, 0.25), 0 8px 24px rgba(0, 0, 0, 0.18)',
        'card-light': '0 1px 3px rgba(0, 0, 0, 0.05), 0 6px 16px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'glass': '18px',
        'pill': '9999px',
      },
      animation: {
        'radar-sweep': 'radarSweep 5s linear infinite',
        'scanline': 'scanlineSweep 0.25s ease-out forwards',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scanlineSweep: {
          '0%': { transform: 'translateY(-100%)', opacity: '0.4' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
}
