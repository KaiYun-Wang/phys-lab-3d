import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import AdminProvider from "@/components/AdminProvider";
import Providers from "@/components/Providers";
import "@/styles/tokens.css";
import "@/styles/admin.css";

// 图标路径随 basePath 走：部署时挂在 /admin 下，本地开发为空（根路径）
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "PhysLab 3D Admin",
  description: "PhysLab 3D 管理端",
  icons: { icon: `${basePath}/favicon-admin-202610052031.svg` },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AuthGuard>
            <AdminProvider>{children}</AdminProvider>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}
