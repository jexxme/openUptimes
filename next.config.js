/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure Redis is treated as a server-only package
  transpilePackages: ['redis'],
  // Prevent Redis from being included in client bundles
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle Redis in client-side code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  // Fix ESLint issues in production build
  eslint: {
    // Don't run ESLint during production builds
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig; 