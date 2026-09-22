import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/editor/**/*.{ts,tsx}',
    './src/studio/**/*.{ts,tsx}',
    './src/tools/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#0c0c0e',    // canvas viewport / app background
          raised: '#141416',  // top bar, status bar
          overlay: '#1a1a1e', // side panels, flyouts, modals
          sunken: '#222228',  // inputs, swatches, layer items
        },
        accent: {
          DEFAULT: '#8b7cff',
          hover: '#9a8dff',
          light: '#b9afff',
          soft: 'rgba(139,124,255,0.15)',
        },
        void: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b8c1',
          400: '#91919f',
          500: '#747484',
          600: '#5e5e6c',
          700: '#4d4d58',
          800: '#42424b',
          900: '#1a1a1f',
          950: '#0d0d10',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
export default config
