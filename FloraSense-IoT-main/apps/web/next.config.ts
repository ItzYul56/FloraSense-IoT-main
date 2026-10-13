import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.1.7", "192.168.1.7:3000"],
};

export default nextConfig;
