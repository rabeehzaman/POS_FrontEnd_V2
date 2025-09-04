import type { NextConfig } from "next";
import withPWA from '@ducanh2912/next-pwa';

// Check if building for mobile (Capacitor)
const isMobileBuild = process.env.CAPACITOR_BUILD === 'true';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Use export for Capacitor builds, standalone for web
  output: isMobileBuild ? 'export' : 'standalone',
  // Add trailing slash for better mobile routing
  trailingSlash: isMobileBuild,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    rules: {
      // Add custom rules if needed
    },
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    // Disable image optimization for static export
    unoptimized: isMobileBuild,
  },
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_IS_MOBILE: isMobileBuild ? 'true' : 'false',
  },
  // Mobile-specific optimizations
  ...(isMobileBuild && {
    basePath: '',
    distDir: 'out',
    // Exclude dynamic API routes from static export
    generateBuildId: async () => {
      return 'mobile-build'
    },
  }),
};

const PWAConfig = withPWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 10,
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 1 day
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|gif|webp|avif|ico|svg)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'images-cache',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        urlPattern: /\.(?:js|css)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-resources',
          expiration: {
            maxEntries: 60,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
        },
      },
    ],
  },
});

export default PWAConfig(nextConfig);
