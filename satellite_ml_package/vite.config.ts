import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: __dirname, // ensure Vite uses the project root
  plugins: [react()],
  build: {
    rollupOptions: {
      input: './index.html' // explicit entry point
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // proxy for backend REST and WebSocket calls
    proxy: {
      '/stream': { target: 'http://localhost:8000', ws: true, changeOrigin: true },
      '/events': { target: 'http://localhost:8000', changeOrigin: true },
      '/replay': { target: 'http://localhost:8000', changeOrigin: true },
      '/simulation': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
      '/metrics': { target: 'http://localhost:8000', changeOrigin: true },
      '/policy': { target: 'http://localhost:8000', changeOrigin: true },
      '/predict': { target: 'http://localhost:8000', changeOrigin: true },
      '/learning': { target: 'http://localhost:8000', changeOrigin: true },
      '/rules': { target: 'http://localhost:8000', changeOrigin: true },
      '/figs': { target: 'http://localhost:8000', changeOrigin: true }
    }
  }
});
