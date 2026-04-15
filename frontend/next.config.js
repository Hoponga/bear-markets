/** @type {import('next').NextConfig} */
// Rewrites run on the Next.js server. Use INTERNAL_API_URL for the upstream API host
// (e.g. http://backend:8000 in Docker, or Railway private URL). Browsers still call /api/proxy;
// INTERNAL_API_URL is never exposed to the client.
const backendUrl =
  process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Enable polling for hot reload in Docker
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `http://backend.railway.internal:8000/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
