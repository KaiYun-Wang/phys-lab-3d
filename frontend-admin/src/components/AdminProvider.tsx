"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { fetchMe, type AdminProfile } from "@/lib/api";
import { clearToken } from "@/lib/auth";

type AdminContextValue = AdminProfile & {
  /** 就地更新资料（个人页保存后同步侧栏） */
  updateAdmin: (admin: AdminProfile) => void;
  /** 侧栏宽度 / 收起态：提升到常驻 Provider，路由切换不再重挂重置 */
  width: number;
  setWidth: (w: number) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin 必须在 AdminProvider 内使用");
  return ctx;
}

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 248;
const WIDTH_KEY = "admin-sidebar-w";
const COLLAPSED_KEY = "admin-sidebar-collapsed";

function clampWidth(w: number) {
  return Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, Math.round(w)));
}

function readStoredWidth() {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT;
  const raw = Number(localStorage.getItem(WIDTH_KEY));
  return Number.isFinite(raw) ? clampWidth(raw) : SIDEBAR_DEFAULT;
}

function readStoredCollapsed() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COLLAPSED_KEY) === "1";
}

/**
 * 管理端常驻 Provider：挂在 root layout 内、路由切换不重挂。
 * - 首屏拉一次 fetchMe 并缓存资料，页面通过 useAdmin() 直接取，不再各自请求；
 * - 侧栏宽度/收起态在这里持久化，切换菜单不会「先恢复默认再跳回」。
 */
export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/login";
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [width, setWidthState] = useState(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsedState] = useState(false);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    if (isLogin) return;
    let cancelled = false;
    fetchMe()
      .then((a) => {
        if (!cancelled) setAdmin(a);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [isLogin, router]);

  useEffect(() => {
    setWidthState(readStoredWidth());
    setCollapsedState(readStoredCollapsed());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [storageReady, width]);

  useEffect(() => {
    if (!storageReady) return;
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [storageReady, collapsed]);

  function setWidth(w: number) {
    setWidthState(clampWidth(w));
  }

  // 登录页不需要资料门槛
  if (isLogin) {
    return <>{children}</>;
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminContext.Provider
      value={{
        ...admin,
        updateAdmin: setAdmin,
        width,
        setWidth,
        collapsed,
        setCollapsed: setCollapsedState,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}
