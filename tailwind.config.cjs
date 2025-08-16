module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        card: 'var(--card)',
        border: 'var(--border)',
        muted: 'var(--muted)',
        text: 'var(--text)',
        brand: 'var(--brand)',
      },
    },
  },
  plugins: [],
};
