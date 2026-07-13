import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import "@/styles/admin.css";

export const metadata: Metadata = {
  title: "PhysLab 3D 管理后台",
  description: "PhysLab 3D 管理端",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;550;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthGuard>{children}</AuthGuard>
      </body>
    </html>
  );
}
