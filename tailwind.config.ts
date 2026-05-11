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
        // SpeechFlow — dark navy as primary (high contrast), cyan as accent
        ocean: {
          50:  '#E0F9FC',
          100: '#B3EFF5',
          200: '#7DE4EE',
          300: '#3DD5E6',
          400: '#00C4D4',  // bright cyan — accent / highlights only
          500: '#0D3A52',  // dark navy — PRIMARY (buttons, active text)
          600: '#0A2D42',
          700: '#072338',
          800: '#041828',
          900: '#020D18',
        },
        // SpeechFlow accent — mid teal for secondary elements
        sand: {
          50:  '#E0F9FC',
          100: '#B3EFF5',
          200: '#7DE4EE',
          300: '#3DD5E6',
          400: '#00C4D4',
          500: '#009BAA',  // mid teal accent
          600: '#007A88',
          700: '#005B68',
          800: '#003C48',
          900: '#001E28',
        },
        sea: {
          light: '#E0F9FC',
          mid:   '#7DE4EE',
          dark:  '#0D3A52',
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
        card: '0 4px 24px rgba(13,58,82,0.10)',
        'card-hover': '0 8px 32px rgba(13,58,82,0.20)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};

export default config;
