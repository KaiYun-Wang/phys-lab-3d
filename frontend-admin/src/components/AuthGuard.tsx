"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getToken, isTokenExpired } from "@/lib/auth";
import { fetchMe } from "@/lib/api";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const isPublic = PUBLIC_PATHS.includes(pathname);
      const token = getToken();

      if (isPublic) {
        if (token && !isTokenExpired(token)) {
          try {
            await fetchMe();
            if (!cancelled) router.replace("/");
            return;
          } catch {
            clearToken();
          }
        }
        if (!cancelled) setReady(true);
        return;
      }

      if (!token || isTokenExpired(token)) {
        clearToken();
        if (!cancelled) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      try {
        await fetchMe();
        if (!cancelled) setReady(true);
      } catch {
        clearToken();
        if (!cancelled) router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      }
    }

    setReady(false);
    check();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return <div className="auth-loading">加载中…</div>;
  }

  return <>{children}</>;
}
