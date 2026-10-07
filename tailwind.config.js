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
          50: '#f8f5ee', 100: '#f0ebdf', 200: '#e2dccb', 300: '#cfc7b0', 400: '#a29a83',
          500: '#797159', 600: '#5c5646', 700: '#443f33', 800: '#2c2923', 900: '#1c1b17', 950: '#12110e',
        },
        // verde de gramado como cor principal (substitui o azul)
        blue: {
          50: '#eef5ee', 100: '#dbeadc', 200: '#b8d5bb', 300: '#8bb990', 400: '#56966a',
          500: '#33794a', 600: '#256239', 700: '#1d4e2f', 800: '#173f26', 900: '#112f1c',
        },
        clay: { 400: '#e4703d', 500: '#d4561f', 600: '#b94416' },
      },
      borderRadius: { xl: '0.625rem', '2xl': '0.875rem' },
    },
  },
  plugins: [],
}
