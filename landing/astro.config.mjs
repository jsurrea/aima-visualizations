import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  site: 'https://jsurrea.github.io',
  base: '/aima-visualizations',
  integrations: [tailwind(), react()],
  output: 'static',
  vite: {
    server: {
      fs: {
        // Allow serving files from the repo root (one level above landing/)
        allow: [path.resolve(__dirname, '..')],
      },
    },
  },
});
