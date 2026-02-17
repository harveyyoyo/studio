import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // Use the underlying workboxOptions for a more direct and robust offline fallback.
  // This tells the service worker to serve '/offline.html' whenever a page navigation fails.
  workboxOptions: {
    navigateFallback: '/offline.html',
  },
  runtimeCaching: [
    {
      // Use a StaleWhileRevalidate strategy for all requests.
      // This serves content from cache first for speed, and updates it from the network in the background.
      // It's a robust strategy for both pages and assets like JS, CSS, and images.
      urlPattern: /.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'all-content',
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    },
  ],
})(nextConfig);
