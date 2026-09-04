import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["jspdf", "html-to-image", "xlsx"],
  },
};

export default nextConfig;
