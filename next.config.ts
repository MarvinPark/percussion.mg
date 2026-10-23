import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    optimizePackageImports: ["jspdf", "html-to-image", "xlsx"],
  },
};

export default nextConfig;
