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
  dest: "public",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    // Cache pages with a NetworkFirst strategy.
    {
      urlPattern: ({ request, url }) => {
        // Only cache navigation requests.
        if (request.mode !== 'navigate') {
          return false;
        }
        // Don't cache API routes.
        if (url.pathname.startsWith('/api/')) {
          return false;
        }
        return true;
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    },
    // Cache static assets (images, fonts, etc.) with a StaleWhileRevalidate strategy.
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico|woff2?|eot|ttf|otf)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        },
      },
    },
    // Cache JS and CSS with a StaleWhileRevalidate strategy.
    {
        urlPattern: /\.(?:js|css)$/,
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'js-css-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
          },
        },
    },
  ],
  workboxOptions: {
    // The ultimate fallback page for when a navigation fails and the page isn't cached.
    navigateFallback: "/offline.html",
  }
})(nextConfig);
