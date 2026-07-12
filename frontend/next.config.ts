import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [{ source: '/login', destination: '/', permanent: true }];
  },
};

export default nextConfig;
