import type { MetadataRoute } from "next";

// 站点公网地址：构建期注入（NEXT_PUBLIC_SITE_URL），未配置或为空时回落 localhost
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // 管理端挂在 /admin 子路径下，不参与收录（安全边界由登录鉴权保证）
        disallow: ["/admin"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
