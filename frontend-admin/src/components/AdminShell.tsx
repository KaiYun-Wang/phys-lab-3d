"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE, type AdminProfile } from "@/lib/api";
import { avatarSrc, displayInitials } from "@/lib/auth";
import { useAdmin } from "@/components/AdminProvider";

type NavItem = {
  /** Font Awesome 6.4 类名（不含 fa-solid 前缀） */
  icon: string;
  label: string;
  href?: string;
  disabled?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const SIDEBAR_COLLAPSED = 64;

function isNavActive(href: string | undefined, pathname: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "概览",
    items: [{ icon: "fa-gauge-high", label: "首页", href: "/" }],
  },
  {
    label: "内容",
    items: [
      { icon: "fa-flask", label: "实验管理", href: "/experiments" },
      { icon: "fa-shapes", label: "学科分类", href: "/subject-types" },
      { icon: "fa-book-open", label: "知识页", href: "/knowledge" },
    ],
  },
  {
    label: "运营",
    items: [
      { icon: "fa-bullhorn", label: "公告管理", href: "/announcements" },
      { icon: "fa-star", label: "收藏管理", href: "/favorites" },
      { icon: "fa-comments", label: "评论管理", href: "/comments" },
      { icon: "fa-heart", label: "点赞管理", href: "/comment-likes" },
    ],
  },
  {
    label: "用户",
    items: [{ icon: "fa-users", label: "用户列表", href: "/users" }],
  },
  {
    label: "系统",
    items: [{ icon: "fa-circle-question", label: "示例问题", href: "/example-questions" }],
  },
];

type Tip = { label: string; y: number };

/** 点击菜单后的即时反馈：导航进行中（含 dev 按需编译等待）时显示转圈 */
function NavPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span className="nav-item__pending" aria-hidden />;
}

function SidebarProfile({
  admin,
  onTipShow,
  onTipHide,
}: {
  admin: AdminProfile;
  onTipShow: (e: React.MouseEvent<HTMLElement>, label: string) => void;
  onTipHide: () => void;
}) {
  const src = avatarSrc(admin.avatarUrl, API_BASE);
  return (
    <Link
      href="/profile"
      className="sidebar-profile"
      aria-label={admin.displayName || "用户设置"}
      onMouseEnter={(e) => onTipShow(e, admin.displayName || "用户设置")}
      onMouseLeave={onTipHide}
    >
      <span className="sidebar-profile__avatar">
        {src ? <img src={src} alt="" /> : displayInitials(admin.displayName)}
      </span>
      <span className="sidebar-profile__name">{admin.displayName}</span>
      <NavPending />
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
  const router = useRouter();
  // 侧栏宽度/收起态提升到常驻 Provider：路由切换不重置、不闪烁
  const { width, setWidth, collapsed, setCollapsed } = useAdmin();
  const dragging = useRef(false);
  const [tip, setTip] = useState<Tip | null>(null);

  // 预热各菜单路由（含个人中心）：
  // dev 模式下 Next 的 router.prefetch 不生效（仅 production 预取），
  // 改用后台串行 fetch 逐个触发 dev server 按需编译，点击菜单时已就绪不卡顿；
  // 用「网络驱动的等待链」而非定时器，避免后台标签页定时器节流导致预热失效；
  // production 下走标准 prefetch（本就预取，无副作用）
  useEffect(() => {
    const hrefs = [
      ...NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href)),
      "/profile",
      "/experiments/new",
    ].filter((href): href is string => !!href);

    if (process.env.NODE_ENV === "production") {
      hrefs.forEach((href) => router.prefetch(href));
      return;
    }

    let cancelled = false;
    void (async () => {
      for (const href of hrefs) {
        if (cancelled) return;
        try {
          await fetch(href, { credentials: "same-origin" });
        } catch {
          // 预热失败不影响正常使用
        }
        // 串行间隔，避免多个页面同时编译造成 dev server 卡顿
        await new Promise((r) => window.setTimeout(r, 150));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // 收起态提示：导航容器是 overflow 滚动区，CSS ::after 会被裁剪，改用 fixed 浮层
  const showTip = useCallback((e: React.MouseEvent<HTMLElement>, label: string) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ label, y: r.top + r.height / 2 });
  }, []);
  const hideTip = useCallback(() => setTip(null), []);

  // 路由切换后指针不在原元素上，避免浮层残留
  useEffect(() => {
    setTip(null);
  }, [pathname]);

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
        setWidth(startW + (ev.clientX - startX));
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
    [collapsed, width, setWidth],
  );

  const sidebarW = collapsed ? SIDEBAR_COLLAPSED : width;

  return (
    <div className={`dash-layout${collapsed ? " is-sidebar-collapsed" : ""}`} style={{ ["--sidebar-w" as string]: `${sidebarW}px` }}>
      <aside className="sidebar">
        <div className="sidebar__brand">
          {/* 左上角品牌标：与用户端一致，可点击（点击刷新页面） */}
          <button
            type="button"
            className="sidebar__home"
            onClick={() => window.location.reload()}
            aria-label="刷新页面"
          >
            <span className="sidebar__logo">
              <i className="fa-solid fa-atom" aria-hidden />
            </span>
            {!collapsed ? (
              <>
                <span className="sidebar__name">PhysLab 3D</span>
                <span className="sidebar__badge">Admin</span>
              </>
            ) : null}
          </button>
          <button
            type="button"
            className="sidebar__collapse"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "展开菜单" : "收起菜单"}
            data-tooltip={collapsed ? "展开菜单" : "收起菜单"}
            data-tooltip-pos="right"
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
                const tipHandlers = {
                  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                    if (collapsed) showTip(e, item.label);
                  },
                  onMouseLeave: hideTip,
                };
                if (item.disabled || !item.href) {
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={className}
                      disabled
                      aria-label={item.label}
                      {...tipHandlers}
                    >
                      <span className="nav-item__icon">
                        <i className={`fa-solid ${item.icon}`} aria-hidden />
                      </span>
                      {!collapsed ? item.label : null}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={className}
                    aria-label={item.label}
                    {...tipHandlers}
                  >
                    <span className="nav-item__icon">
                      <i className={`fa-solid ${item.icon}`} aria-hidden />
                    </span>
                    {!collapsed ? item.label : null}
                    <NavPending />
                  </Link>
                );
              })}
            </nav>
          ))}
        </div>

        <div className="sidebar__foot">
          <SidebarProfile
            admin={admin}
            onTipShow={(e, label) => {
              if (collapsed) showTip(e, label);
            }}
            onTipHide={hideTip}
          />
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

      {collapsed && tip ? (
        <div className="sidebar-float-tip" style={{ top: `${tip.y}px` }} role="tooltip">
          {tip.label}
        </div>
      ) : null}
    </div>
  );
}
