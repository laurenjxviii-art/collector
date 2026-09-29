/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/pixel-perfect/**/*.{js,ts,jsx,tsx}',
  ],
  important: '#pp-root',
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
