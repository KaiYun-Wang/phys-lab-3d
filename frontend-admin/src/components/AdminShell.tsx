"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, type AdminProfile } from "@/lib/api";
import { avatarSrc, displayInitials } from "@/lib/auth";

type NavItem = {
  icon: string;
  label: string;
  href?: string;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 420;
const SIDEBAR_DEFAULT = 248;
const SIDEBAR_COLLAPSED = 64;
const WIDTH_KEY = "admin-sidebar-w";
const COLLAPSED_KEY = "admin-sidebar-collapsed";

function isNavActive(href: string | undefined, pathname: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "概览",
    items: [{ icon: "▦", label: "首页", href: "/" }],
  },
  {
    label: "内容",
    items: [
      { icon: "⚗", label: "实验管理", href: "/experiments" },
      { icon: "◎", label: "学科分类", href: "/subject-types" },
      { icon: "📚", label: "知识页", href: "/knowledge" },
    ],
  },
  {
    label: "运营",
    items: [
      { icon: "📢", label: "公告管理", href: "/announcements" },
      { icon: "★", label: "收藏管理", href: "/favorites" },
      { icon: "💬", label: "评论管理", href: "/comments" },
      { icon: "♥", label: "点赞管理", href: "/comment-likes" },
    ],
  },
  {
    label: "用户",
    items: [{ icon: "◉", label: "用户列表", href: "/users" }],
  },
  {
    label: "系统",
    items: [{ icon: "?", label: "示例问题", href: "/example-questions" }],
  },
];

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

function SidebarProfile({ admin, collapsed }: { admin: AdminProfile; collapsed: boolean }) {
  const src = avatarSrc(admin.avatarUrl, API_BASE);
  return (
    <Link href="/profile" className="sidebar-profile" title={admin.displayName || "用户设置"}>
      <span className="sidebar-profile__avatar">
        {src ? <img src={src} alt="" /> : displayInitials(admin.displayName)}
      </span>
      {!collapsed ? <span className="sidebar-profile__name">{admin.displayName}</span> : null}
    </Link>
  );
}

export default function AdminShell({
  admin,
  children,
}: {
  admin: AdminProfile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [width, setWidth] = useState(SIDEBAR_DEFAULT);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const dragging = useRef(false);

  useEffect(() => {
    setWidth(readStoredWidth());
    setCollapsed(readStoredCollapsed());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(WIDTH_KEY, String(width));
  }, [ready, width]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [ready, collapsed]);

  const onResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (collapsed) return;
      e.preventDefault();
      dragging.current = true;
      const startX = e.clientX;
      const startW = width;
      document.body.classList.add("is-sidebar-resizing");

      function onMove(ev: PointerEvent) {
        if (!dragging.current) return;
        setWidth(clampWidth(startW + (ev.clientX - startX)));
      }

      function onUp() {
        dragging.current = false;
        document.body.classList.remove("is-sidebar-resizing");
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      }

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [collapsed, width],
  );

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : width;

  return (
    <div className={`dash-layout${collapsed ? " is-sidebar-collapsed" : ""}`} style={{ ["--sidebar-w" as string]: `${sidebarW}px` }}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          {!collapsed ? (
            <>
              <span className="sidebar__name">PhysLab 3D</span>
              <span className="sidebar__badge">Admin</span>
            </>
          ) : (
            <span className="sidebar__name sidebar__name--short" title="PhysLab 3D">
              P
            </span>
          )}
          <button
            type="button"
            className="sidebar__collapse"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "展开菜单" : "收起菜单"}
            title={collapsed ? "展开菜单" : "收起菜单"}
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <div className="sidebar__nav">
          {NAV_GROUPS.map((group) => (
            <nav key={group.label} className="nav-group">
              {!collapsed ? <span className="nav-group__label">{group.label}</span> : null}
              {group.items.map((item) => {
                const className = `nav-item${isNavActive(item.href, pathname) ? " is-active" : ""}`;
                if (item.disabled || !item.href) {
                  return (
                    <button key={item.label} type="button" className={className} disabled title={item.label}>
                      <span className="nav-item__icon">{item.icon}</span>
                      {!collapsed ? item.label : null}
                    </button>
                  );
                }
                return (
                  <Link key={item.label} href={item.href} className={className} title={item.label}>
                    <span className="nav-item__icon">{item.icon}</span>
                    {!collapsed ? item.label : null}
                  </Link>
                );
              })}
            </nav>
          ))}
        </div>

        <div className="sidebar__foot">
          <SidebarProfile admin={admin} collapsed={collapsed} />
        </div>

        {!collapsed ? (
          <div
            className="sidebar__resizer"
            onPointerDown={onResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="调节菜单宽度"
          />
        ) : null}
      </aside>

      <div className="dash-main">
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
