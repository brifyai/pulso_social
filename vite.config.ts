import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  // Usar '/' para producción en Easy Panel, o '/ai-town' si está en subdirectorio
  base: process.env.NODE_ENV === 'production' ? '/' : '/ai-town',
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true, // Permitir todos los hosts
  },
});
