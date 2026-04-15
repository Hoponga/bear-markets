/** @type {import('next').NextConfig} */
// Rewrites run inside the Node server. In Docker, localhost is the frontend container — use the backend service name.
// Browser code should keep using NEXT_PUBLIC_API_URL (localhost) for direct calls; INTERNAL_API_URL is server-only.
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
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
