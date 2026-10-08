import type { NextConfig } from "next";

// 本机开发不设 NEXT_PUBLIC_BASE_PATH（挂在根路径）；
// Docker 构建传 /admin：统一入口下的管理端路径（nginx /admin → 管理端容器）
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  basePath,
  // Docker 镜像用 standalone 输出（只带运行时需要的最小 node_modules）
  output: "standalone",
};

export default nextConfig;
