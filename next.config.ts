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
};

export default nextConfig;
