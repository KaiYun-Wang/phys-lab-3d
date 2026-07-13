"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AdminProfile } from "@/lib/api";
import { clearToken, displayInitials } from "@/lib/auth";

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
    ],
  },
  {
    label: "用户",
    items: [
      { icon: "◉", label: "用户列表", disabled: true },
      { icon: "⊞", label: "权限角色", disabled: true },
    ],
  },
  {
    label: "系统",
    items: [
      { icon: "⚙", label: "系统设置", disabled: true },
      { icon: "≡", label: "操作日志", disabled: true },
    ],
  },
];

function formatDate() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export default function AdminShell({
  admin,
  title,
  children,
}: {
  admin: AdminProfile;
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function logout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">P3</div>
          <span className="sidebar__name">PhysLab 3D</span>
          <span className="sidebar__badge">Admin</span>
        </div>

        {NAV_GROUPS.map((group) => (
          <nav key={group.label} className="nav-group">
            <span className="nav-group__label">{group.label}</span>
            {group.items.map((item) => {
              const className = `nav-item${isNavActive(item.href, pathname) ? " is-active" : ""}`;
              if (item.disabled || !item.href) {
                return (
                  <button key={item.label} type="button" className={className} disabled>
                    <span className="nav-item__icon">{item.icon}</span>
                    {item.label}
                  </button>
                );
              }
              return (
                <Link key={item.label} href={item.href} className={className}>
                  <span className="nav-item__icon">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ))}

        <div className="sidebar__foot">
          <button type="button" className="nav-item" onClick={logout}>
            <span className="nav-item__icon">↩</span>
            退出登录
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <header className="topbar">
          <div className="topbar__left">
            <span className="topbar__title">{title}</span>
            <span className="micro">{formatDate()}</span>
          </div>
          <div className="topbar__right">
            <button type="button" className="btn-pill btn-pill--outline btn-pill--sm" disabled>
              导出报告
            </button>
            <div className="topbar__avatar" title={admin.displayName}>
              {displayInitials(admin.displayName)}
            </div>
          </div>
        </header>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
