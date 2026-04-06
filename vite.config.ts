import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('@tanstack/react-query')) return 'vendor-query';
          if (id.includes('react-hook-form') || id.includes('@hookform/resolvers') || id.includes('zod')) {
            return 'vendor-forms';
          }
          if (id.includes('@reduxjs/toolkit') || id.includes('react-redux') || id.includes('zustand')) {
            return 'vendor-state';
          }
          if (id.includes('react-router-dom')) return 'vendor-router';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';

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
    proxy: {
      // Proxies API calls to your Spring Boot backend
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});