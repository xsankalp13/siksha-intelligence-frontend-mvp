import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [react(), basicSsl()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          // ── Heavy standalone libraries (own chunks) ──────────────
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('date-fns')) return 'vendor-dates';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
          if (id.includes('html5-qrcode') || id.includes('qrcode')) return 'vendor-qrcode';

          // ── Data / state ──────────────────────────────────────────
          if (id.includes('@tanstack/react-query') || id.includes('@tanstack/react-virtual')) {
            return 'vendor-query';
          }
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('zustand')) {
            return 'vendor-state';
          }

          // ── Forms & validation ────────────────────────────────────
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
            return 'vendor-forms';
          }

          // ── Drag & drop ───────────────────────────────────────────
          if (id.includes('@dnd-kit')) return 'vendor-dnd';

          // ── UI primitives ─────────────────────────────────────────
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (
            id.includes('cmdk') ||
            id.includes('sonner') ||
            id.includes('next-themes') ||
            id.includes('class-variance-authority') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge')
          ) {
            return 'vendor-ui';
          }

          // ── Network ───────────────────────────────────────────────
          if (id.includes('axios')) return 'vendor-http';

          // ── Routing ───────────────────────────────────────────────
          if (id.includes('react-router-dom')) return 'vendor-router';

          // ── React core ────────────────────────────────────────────
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react/jsx')) {
            return 'vendor-react';
          }

          return 'vendor-misc';
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@features': path.resolve(__dirname, './src/features'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
  server: {
    host: true, // Listen on all local IPs
    proxy: {
      // Proxies API calls to your Spring Boot backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            // Rewrite origin so the Spring Boot Dev server accepts it
            proxyReq.setHeader('Origin', 'http://localhost:5173');
          });
        }
      },
    },
  },
});