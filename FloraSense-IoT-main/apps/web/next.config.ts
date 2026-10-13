import type { NextConfig } from "next";

const allowedDevOrigins: string[] = [
  "localhost",
  "127.0.0.1",
  "54.166.220.66",
  "*.*.*.*",
  "*.compute.amazonaws.com",
  "*.compute-1.amazonaws.com",
];

if (process.env.EC2_PUBLIC_IP) {
  allowedDevOrigins.push(process.env.EC2_PUBLIC_IP);
}

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins,
};

export default nextConfig;
