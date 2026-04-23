import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // CuraVein brand palette — single source of truth
        curavein: {
          teal: '#5FAAA6',       // primary accent (already used in buttons/highlights)
          'teal-dark': '#4A8C89',
          'teal-light': '#7CC4C0',
          brown: '#A84D2E',      // secondary accent / wordmark
          'brown-dark': '#8A3F26',
          'brown-light': '#C26848',
        },
      },
    },
  },
  plugins: [],
}

export default config
