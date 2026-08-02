/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3D5A80',
          hover: '#4A6B94',
          active: '#2C4460',
          light: '#E8EDF3',
        },
        ink: {
          DEFAULT: '#1A2332',
          secondary: '#6B7B8D',
          disabled: '#B0B8C2',
        },
        canvas: '#F0F2F5',
        line: '#E4E8EE',
        sidebar: {
          DEFAULT: '#1A2332',
          hover: '#2A3A4E',
          active: '#3D5A80',
          text: '#8B9BB4',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', '"Helvetica Neue"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.06)',
        pop: '0 6px 16px rgba(0,0,0,0.08)',
        modal: '0 12px 40px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        card: '12px',
        control: '8px',
      },
    },
  },
  plugins: [],
};
