/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0D2847',
          light: '#134E6F',
          lighter: '#1E5F7A',
          muted: 'rgba(13, 40, 71, 0.10)',
        },
        dark: {
          primary: '#2D7AB0',
          'primary-lighter': '#5BA3E0',
          'primary-muted': 'rgba(91, 163, 224, 0.15)',
        },
        page: '#F5F5F7',
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#EBEBED',
          muted: '#F3F4F6',
          inset: '#EBEDF0',
        },
        border: {
          DEFAULT: '#E8E8EB',
          light: '#EBEDF0',
        },
        'text-primary': '#1F2329',
        'text-secondary': '#646A73',
        'text-muted': '#8F959E',
        'dark-bg': '#1A1C20',
        'dark-surface': {
          DEFAULT: '#1A1D27',
          hover: '#242830',
          muted: '#151820',
          inset: '#0C0E14',
        },
        'dark-border': {
          DEFAULT: '#2A2E38',
          light: '#1F232B',
        },
        'dark-text': '#E4E5E9',
        'dark-text-secondary': '#9CA3AF',
        'dark-text-muted': '#8B8FA3',
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(0,0,0,0.05)',
        card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 12px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.04)',
        modal: '0 8px 30px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
        popover: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.05)',
        focus: '0 8px 32px rgba(13, 40, 71, 0.18)',
        'focus-dark': '0 8px 32px rgba(91, 163, 224, 0.25)',
        'card-hover': '0 2px 12px rgba(13, 40, 71, 0.12)',
        'card-hover-dark': '0 2px 12px rgba(91, 163, 224, 0.2)',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'Helvetica Neue',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
