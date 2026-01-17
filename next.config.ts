import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed serverExternalPackages - it caused ES Module loading issues
  // MetaAPI will be bundled by Turbopack with proper tree-shaking
  experimental: {
    // Enable server actions for better performance
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
