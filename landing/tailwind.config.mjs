/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#6366F1',
        'primary-dark': '#4338CA',
        secondary: '#10B981',
        accent: '#F59E0B',
        'surface-base': '#0A0A0F',
        'surface-1': '#111118',
        'surface-2': '#1A1A24',
        'surface-3': '#242430',
      },
      fontFamily: {
        sans: ['Inter Variable', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '12px',
        lg: '20px',
      },
    },
  },
  plugins: [],
};
