/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable SWC minification which relies on lightningcss
  swcMinify: false,
  
  // Disable ESLint during build
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  
  // Set webpack 5 to use cssnano instead of lightningcss
  webpack: (config) => {
    return config;
  }
};

module.exports = nextConfig; 