import type { Metadata, Viewport } from "next";
import "./globals.css";
import AuthGuard from "@/components/AuthGuard";
import AiChatWidget from "@/components/AiChatWidget";
import AnnouncementPopup from "@/components/AnnouncementPopup";
import TooltipLayer from "@/components/TooltipLayer";
import UserMotion from "@/components/UserMotion";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: false,
  interactiveWidget: "resizes-content",
  viewportFit: "cover",
};

// 站点公网地址：构建期注入（NEXT_PUBLIC_SITE_URL），未配置或为空时回落 localhost
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "PhysLab 3D";
const SITE_TITLE = "PhysLab 3D";
const SITE_DESCRIPTION =
  "PhysLab 3D —— 浏览器里的交互式 3D 物理实验平台：调节参数、观察现象、理解规律，覆盖光学、量子、相对论、流体、声学等主题。";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "物理实验",
    "3D 物理仿真",
    "虚拟实验室",
    "在线物理实验",
    "交互式物理",
    "物理教学",
    "光学实验",
    "量子物理",
    "相对论",
    "流体力学",
    "声学",
    "双缝实验",
    "光电效应",
    "多普勒效应",
    "凸透镜成像",
    "伯努利原理",
    "史瓦西黑洞",
    "physlab",
  ],
  authors: [{ name: "KaiYun-Wang", url: "https://github.com/KaiYun-Wang" }],
  creator: "KaiYun-Wang",
  publisher: "KaiYun-Wang",
  category: "Education",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
  },
  icons: {
    icon: [{ url: "/favicon-v2.svg", type: "image/svg+xml" }],
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#webapp`,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
      author: {
        "@type": "Person",
        "@id": `${SITE_URL}/#author`,
        name: "KaiYun-Wang",
        url: "https://github.com/KaiYun-Wang",
        sameAs: ["https://github.com/KaiYun-Wang"],
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${SITE_URL}/?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      founder: {
        "@type": "Person",
        name: "KaiYun-Wang",
        url: "https://github.com/KaiYun-Wang",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />
        {/* 文件名带版本号：换图标时同步换名，否则浏览器 favicon 缓存不会更新 */}
        <link rel="icon" href="/favicon-v2.svg" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="m-0 p-0">
        <AuthGuard>
          {children}
          <UserMotion />
          <AiChatWidget />
          <AnnouncementPopup />
          <TooltipLayer />
        </AuthGuard>
      </body>
    </html>
  );
}
