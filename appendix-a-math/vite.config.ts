import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  base: '/aima-visualizations/appendix-a/',
  plugins: [
    react(),
    federation({
      name: 'appendix_a',
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
