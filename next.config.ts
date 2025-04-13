import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["redis"],
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
