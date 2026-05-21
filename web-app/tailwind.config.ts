import type {Config} from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'sense-forest': '#1f5135',
        'sense-gold': '#d5a12f',
        'sense-ink': '#17211c',
        'sense-surface': '#f8faf7',
      },
    },
  },
  plugins: [],
};

export default config;
