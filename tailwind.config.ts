import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SpeechFlow primary — cyan/teal from logo
        ocean: {
          50:  '#E0F9FC',
          100: '#B3EFF5',
          200: '#7DE4EE',
          300: '#3DD5E6',
          400: '#0ECADC',
          500: '#00C4D4',  // primary — SpeechFlow cyan
          600: '#009BAA',
          700: '#007280',
          800: '#004D57',
          900: '#00272D',
        },
        // SpeechFlow dark navy — from logo rocket/overlap
        sand: {
          50:  '#E8EEF3',
          100: '#C4D3DD',
          200: '#9DB6C6',
          300: '#6F95AB',
          400: '#477A95',
          500: '#1B6080',  // mid navy accent
          600: '#154E6A',
          700: '#0D3A52',  // dark navy — SpeechFlow brand dark
          800: '#082A3C',
          900: '#041A26',
        },
        sea: {
          light: '#E0F9FC',
          mid:   '#7DE4EE',
          dark:  '#00C4D4',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        heading: ['Red Hat Display', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,196,212,0.12)',
        'card-hover': '0 8px 32px rgba(0,196,212,0.22)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
