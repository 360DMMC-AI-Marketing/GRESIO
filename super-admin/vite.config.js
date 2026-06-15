import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/super-admin/',
  plugins: [react()],
  server: {
    port: 4000,
    host: '0.0.0.0',
    proxy: {
      '/super-api': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});
