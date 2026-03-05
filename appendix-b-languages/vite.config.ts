import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  base: '/aima-visualizations/appendix-b/',
  plugins: [
    react(),
    federation({
      name: 'appendix_b',
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
