import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // MiniPay compatibility optimizations
  experimental: {
    optimizePackageImports: ['wagmi', 'viem'],
  },
};

export default nextConfig;
