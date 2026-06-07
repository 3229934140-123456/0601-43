/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
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
        method: {
          get: '#22c55e',
          post: '#f59e0b',
          put: '#3b82f6',
          delete: '#ef4444',
          patch: '#8b5cf6',
          head: '#6b7280',
          options: '#06b6d4',
        }
      }
    },
  },
  plugins: [],
}
