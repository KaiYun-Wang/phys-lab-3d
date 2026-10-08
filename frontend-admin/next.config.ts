import type { NextConfig } from "next";

// NEXT_PUBLIC_BASE_PATH：本地不设（根路径），Docker 构建传 /admin
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  // Docker 镜像用 standalone 输出
  output: "standalone",
};

export default nextConfig;
