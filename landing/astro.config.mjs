import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://jsurrea.github.io',
  base: '/aima-visualizations',
  integrations: [tailwind(), react()],
  output: 'static',
});
