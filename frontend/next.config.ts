import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: __dirname },
  output: "standalone",
};

export default nextConfig;
