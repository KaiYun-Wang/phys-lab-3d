import type { NextConfig } from "next";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
let apiHostname = "localhost";
try {
  apiHostname = new URL(apiUrl).hostname;
} catch {
  /* keep default */
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  // Docker 镜像用 standalone 输出
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "http", hostname: apiHostname, pathname: "/**" },
      { protocol: "https", hostname: apiHostname, pathname: "/**" },
    ],
  },
};

export default nextConfig;
