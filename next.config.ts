import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["redis", "node-cron"],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    return config;
  },
};

export default nextConfig;
