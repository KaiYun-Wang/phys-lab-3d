import Link from "next/link";
import type { ReactNode } from "react";

/**
 * 页面面包屑：标题左端的上级菜单（「‹ 实验列表 › 新建实验」）
 * 用法：<PageCrumb parent="实验列表" parentHref="/experiments"><h2 className="page-title">…</h2></PageCrumb>
 */
export default function PageCrumb({
  parent,
  parentHref,
  children,
}: {
  parent: string;
  parentHref: string;
  children: ReactNode;
}) {
  return (
    <nav className="page-head" aria-label="位置">
      <Link href={parentHref} className="page-crumb__link">
        <span className="page-crumb__chev" aria-hidden>
          ‹
        </span>
        {parent}
      </Link>
      <span className="page-crumb__sep" aria-hidden>
        ›
      </span>
      {children}
    </nav>
  );
}
