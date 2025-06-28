/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'green-eco': '#4CAF50',
        'blue-recycle': '#2196F3',
        'orange-ewaste': '#FF9800',
        'brown-organic': '#795548',
      }
    },
  },
  plugins: [],
} 