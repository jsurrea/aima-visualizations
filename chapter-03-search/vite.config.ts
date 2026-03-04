import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  base: '/aima-visualizations/chapter-03/',
  plugins: [
    react(),
    federation({
      name: 'chapter_03',
      filename: 'remoteEntry.js',
      exposes: {
        './App': './src/App',
      },
      shared: ['react', 'react-dom', 'katex'],
    }),
  ],
  build: {
    target: 'esnext',
    modulePreload: false,
    outDir: 'dist',
    rollupOptions: {
      input: 'index.html',
    },
  },
});
