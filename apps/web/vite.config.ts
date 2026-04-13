import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  server: {
    host: '::',
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      // Market service (:8002) — must precede /api/v1/users (identity) to win for job-reviews sub-route
      '^/api/v1/users/[^/]+/job-reviews': { target: 'http://localhost:8002', changeOrigin: true },
      // Identity service (:8001)
      '/api/v1/auth': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/v1/users': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/v1/profile': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/v1/kyc': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/v1/notifications': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/v1/saved-items': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/v1/search': { target: 'http://localhost:8001', changeOrigin: true },
      // Market service (:8002) — jobs
      '/api/v1/jobs': { target: 'http://localhost:8002', changeOrigin: true },
      // Market service (:8002)
      '/api/v1/listings': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/market': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/prices': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/price-index': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/commodit': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/business': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/opportunities': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/investments': { target: 'http://localhost:8002', changeOrigin: true },
      // Admin routes — must appear before service-specific prefixes and before /api fallback
      '/api/v1/admin/guides': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/v1/admin/bookings': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/v1/admin/moderation': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/admin/listings': { target: 'http://localhost:8002', changeOrigin: true },
      '/api/v1/admin/stats': { target: 'http://localhost:8002', changeOrigin: true },
      // Guide-Booking service (:8003)
      '/api/v1/guides': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/v1/packages': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/v1/bookings': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/v1/reviews': { target: 'http://localhost:8003', changeOrigin: true },
      '/api/v1/attractions': { target: 'http://localhost:8003', changeOrigin: true },
      // Map service (:8004)
      '/api/v1/map': { target: 'http://localhost:8004', changeOrigin: true },
      '/api/v1/carpool': { target: 'http://localhost:8004', changeOrigin: true },
      // AI service (:8005)
      '/api/v1/chat': { target: 'http://localhost:8005', changeOrigin: true },
      '/api/v1/ai': { target: 'http://localhost:8005', changeOrigin: true },
      // Fallback — identity
      '/api': { target: 'http://localhost:8001', changeOrigin: true },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
