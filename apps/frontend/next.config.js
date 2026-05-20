const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: { maxEntries: 10, maxAgeSeconds: 365 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: { maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.API_URL || 'http://localhost:4001',
    NEXT_PUBLIC_AI_ENGINE_URL: process.env.AI_ENGINE_URL || 'http://localhost:8000',
  },
  output: 'standalone',
}

module.exports = withPWA(nextConfig)
