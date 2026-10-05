"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken, isTokenExpired } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

/**
 * 只做本地 token 校验（同步、无网络）：首屏 ready 后不再整屏 loading。
 * 身份有效性（fetchMe）与资料缓存由常驻的 AdminProvider 统一负责，
 * 这样切换菜单时不会重复触发全屏重载。
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(pathname);
    const token = getToken();
    const authed = !!token && !isTokenExpired(token);

    if (isPublic) {
      if (authed) {
        router.replace("/");
        return;
      }
      if (token) clearToken();
      setReady(true);
      return;
    }

    if (!authed) {
      clearToken();
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return <div className="auth-loading">加载中…</div>;
  }

  return <>{children}</>;
}
