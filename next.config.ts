import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["redis"],
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
