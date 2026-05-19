/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['SF Mono', 'Fira Code', 'Fira Mono', 'Roboto Mono', 'monospace'],
      },
      boxShadow: {
        'violet-sm': '0 4px 15px rgba(124,58,237,0.25)',
        'violet-md': '0 8px 25px rgba(124,58,237,0.35)',
        'emerald-sm': '0 4px 15px rgba(5,150,105,0.25)',
        'emerald-md': '0 8px 25px rgba(5,150,105,0.35)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
        'modal': '0 24px 80px rgba(0,0,0,0.7)',
      },
    },
  },
  plugins: [],
}
