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
        ocean: {
          50:  '#E8F3FB',
          100: '#C3DFF5',
          200: '#8EC3EC',
          300: '#4FA3DF',
          400: '#1A85D0',
          500: '#015687',  // primary — SpeechFlow brand blue
          600: '#014A76',
          700: '#013D63',
          800: '#013151',
          900: '#002540',
        },
        sand: {
          50:  '#F3EAFD',
          100: '#E5CFFB',
          200: '#CB9DF6',
          300: '#B16CF0',
          400: '#A45DE6',
          500: '#9b51e0',  // accent — SpeechFlow brand purple
          600: '#7C40B4',
          700: '#5E2F89',
          800: '#401F60',
          900: '#210F34',
        },
        sea: {
          light: '#E8F3FB',
          mid:   '#8EC3EC',
          dark:  '#015687',
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
        card: '0 4px 24px rgba(1,86,135,0.10)',
        'card-hover': '0 8px 32px rgba(1,86,135,0.18)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
