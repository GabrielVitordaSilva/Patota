/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Figtree', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // neutros quentes (papel / tinta) no lugar do cinza azulado padrao
        slate: {
          50: '#fbf9f4', 100: '#f4f0e6', 200: '#e2dccb', 300: '#cfc7b0', 400: '#a29a83',
          500: '#797159', 600: '#5c5646', 700: '#443f33', 800: '#2c2923', 900: '#1c1b17', 950: '#12110e',
        },
        // verde de gramado como cor principal (substitui o azul)
        blue: {
          50: '#f1f8f3', 100: '#e0f1e5', 200: '#c3e3cd', 300: '#98cfab', 400: '#68b784',
          500: '#44a06a', 600: '#33895a', 700: '#2a7449', 800: '#215c3a', 900: '#194630',
        },
        clay: { 400: '#e4703d', 500: '#d4561f', 600: '#b94416' },
      },
      borderRadius: { xl: '0.625rem', '2xl': '0.875rem' },
    },
  },
  plugins: [],
}
