"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
      { icon: "♥", label: "评论点赞", href: "/comment-likes" },
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

function SidebarProfile({ admin }: { admin: AdminProfile }) {
  const src = avatarSrc(admin.avatarUrl, API_BASE);
  return (
    <Link href="/profile" className="sidebar-profile" title="用户设置">
      <span className="sidebar-profile__avatar">
        {src ? <img src={src} alt="" /> : displayInitials(admin.displayName)}
      </span>
      <span className="sidebar-profile__name">{admin.displayName}</span>
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

  return (
    <div className="dash-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__name">PhysLab 3D</span>
          <span className="sidebar__badge">Admin</span>
        </div>

        <div className="sidebar__nav">
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
        </div>

        <div className="sidebar__foot">
          <SidebarProfile admin={admin} />
        </div>
      </aside>

      <div className="dash-main">
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
