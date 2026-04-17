import { resolveLocalServiceUrl, resolveWorktreePort } from '@hena-wadeena/types';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repoRoot, '');
  const identityUrl = resolveLocalServiceUrl({
    defaultPort: 8001,
    explicitPort: env.IDENTITY_PORT,
    explicitUrl: env.IDENTITY_SERVICE_URL,
    env,
  });
  const marketUrl = resolveLocalServiceUrl({
    defaultPort: 8002,
    explicitPort: env.MARKET_PORT,
    explicitUrl: env.MARKET_SERVICE_URL,
    env,
  });
  const guideBookingUrl = resolveLocalServiceUrl({
    defaultPort: 8003,
    explicitPort: env.GUIDE_BOOKING_PORT,
    explicitUrl: env.GUIDE_BOOKING_SERVICE_URL,
    env,
  });
  const mapUrl = resolveLocalServiceUrl({
    defaultPort: 8004,
    explicitPort: env.MAP_PORT,
    explicitUrl: env.MAP_SERVICE_URL,
    env,
  });
  const aiUrl = resolveLocalServiceUrl({
    defaultPort: 8005,
    explicitPort: env.AI_PORT,
    explicitUrl: env.AI_SERVICE_URL,
    env,
  });

  return {
    envDir: repoRoot,
    server: {
      host: '::',
      port: resolveWorktreePort(8080, env.WEB_PORT, env),
      hmr: {
        overlay: false,
      },
      proxy: {
        '^/api/v1/users/[^/]+/job-reviews$': { target: marketUrl, changeOrigin: true },
        // Identity service
        '/api/v1/auth': { target: identityUrl, changeOrigin: true },
        '/api/v1/users': { target: identityUrl, changeOrigin: true },
        '/api/v1/profile': { target: identityUrl, changeOrigin: true },
        '/api/v1/kyc': { target: identityUrl, changeOrigin: true },
        '/api/v1/notifications': { target: identityUrl, changeOrigin: true },
        '/api/v1/saved-items': { target: identityUrl, changeOrigin: true },
        '/api/v1/search': { target: identityUrl, changeOrigin: true },
        // Market service
        '/api/v1/listings': { target: marketUrl, changeOrigin: true },
        '/api/v1/market': { target: marketUrl, changeOrigin: true },
        '/api/v1/prices': { target: marketUrl, changeOrigin: true },
        '/api/v1/price-index': { target: marketUrl, changeOrigin: true },
        '/api/v1/price-alerts': { target: marketUrl, changeOrigin: true },
        '/api/v1/commodit': { target: marketUrl, changeOrigin: true },
        '/api/v1/business': { target: marketUrl, changeOrigin: true },
        '/api/v1/opportunities': { target: marketUrl, changeOrigin: true },
        '/api/v1/investments': { target: marketUrl, changeOrigin: true },
        '/api/v1/jobs': { target: marketUrl, changeOrigin: true },
        '/api/v1/listing-inquiries': { target: marketUrl, changeOrigin: true },
        '/api/v1/well-logs': { target: marketUrl, changeOrigin: true },
        '/api/v1/benefits': { target: marketUrl, changeOrigin: true },
        '/api/v1/news': { target: marketUrl, changeOrigin: true },
        '/api/v1/artisans': { target: marketUrl, changeOrigin: true },
        // Admin routes — must appear before service-specific prefixes and before /api fallback
        '/api/v1/admin/users': { target: identityUrl, changeOrigin: true },
        '/api/v1/admin/guides': { target: guideBookingUrl, changeOrigin: true },
        '/api/v1/admin/bookings': { target: guideBookingUrl, changeOrigin: true },
        '/api/v1/admin/moderation': { target: marketUrl, changeOrigin: true },
        '/api/v1/admin/listings': { target: marketUrl, changeOrigin: true },
        '/api/v1/admin/stats': { target: marketUrl, changeOrigin: true },
        '/api/v1/admin/news': { target: marketUrl, changeOrigin: true },
        '/api/v1/admin/artisans': { target: marketUrl, changeOrigin: true },
        // Guide-Booking service
        '/api/v1/guides': { target: guideBookingUrl, changeOrigin: true },
        '/api/v1/packages': { target: guideBookingUrl, changeOrigin: true },
        '/api/v1/bookings': { target: guideBookingUrl, changeOrigin: true },
        '/api/v1/reviews': { target: marketUrl, changeOrigin: true },
        '/api/v1/guide-reviews': { target: guideBookingUrl, changeOrigin: true },
        '/api/v1/attractions': { target: guideBookingUrl, changeOrigin: true },
        // Map service
        '/api/v1/map': { target: mapUrl, changeOrigin: true },
        '/api/v1/carpool': { target: mapUrl, changeOrigin: true },
        // AI service
        '/api/v1/chat': { target: aiUrl, changeOrigin: true },
        '/api/v1/ai': { target: aiUrl, changeOrigin: true },
        // Fallback — identity
        '/api': { target: identityUrl, changeOrigin: true },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@hena-wadeena/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
