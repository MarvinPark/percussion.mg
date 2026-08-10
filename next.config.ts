import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["jspdf", "html-to-image"],
  },
};

export default nextConfig;
