"use client";

import { useId } from "react";

/**
 * PhysLab 3D 品牌标识。
 *
 * 造型取自设计稿 logo：三个相互交叠的椭圆（0° / 60° / 120°）构成原子轨道，
 * 中心内接一组几何弦线；描边为蓝 → 青渐变并带外发光。
 */
export function AtomMark({
  size = 28,
  /** 整体缓慢自转（用于登录页 / 首页主标识） */
  spin = false,
  className,
}: {
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  // useId 保证 SSR/CSR 一致；冒号在 SVG url(#…) 里不合法，去掉
  const uid = useId().replace(/:/g, "");
  const gid = `atom-grad-${uid}`;
  const fid = `atom-glow-${uid}`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-label="PhysLab 3D"
      style={spin ? { animation: "kh-atom-spin 18s linear infinite" } : undefined}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="20" x2="92" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="52%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#67e8f9" />
        </linearGradient>
        <filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        filter={`url(#${fid})`}
        stroke={`url(#${gid})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* 三个交叠椭圆 = 原子轨道 */}
        <ellipse cx="50" cy="50" rx="19" ry="41" />
        <ellipse cx="50" cy="50" rx="19" ry="41" transform="rotate(60 50 50)" />
        <ellipse cx="50" cy="50" rx="19" ry="41" transform="rotate(120 50 50)" />

        {/* 中心内接几何弦线 */}
        <path d="M50 24 L74 62 L26 62 Z" strokeWidth="2.2" opacity="0.9" />
        <path d="M50 76 L74 38 L26 38 Z" strokeWidth="2.2" opacity="0.9" />
        <path d="M50 24 L50 76" strokeWidth="1.6" opacity="0.6" />
        <path d="M26 38 L74 62" strokeWidth="1.6" opacity="0.6" />
        <path d="M74 38 L26 62" strokeWidth="1.6" opacity="0.6" />
      </g>
    </svg>
  );
}

/** 完整品牌头：原子标识 + 渐变字标 + 副标题 */
export function BrandLockup({
  size = 30,
  spin = false,
  tagline = "虚拟仿真与学术计算平台",
  showTagline = true,
  href,
}: {
  size?: number;
  spin?: boolean;
  tagline?: string;
  showTagline?: boolean;
  href?: string;
}) {
  const inner = (
    <>
      <AtomMark size={size} spin={spin} className="kh-lockup__mark" />
      <span className="kh-lockup__text">
        <span className="kh-lockup__word">PhysLab 3D</span>
        {showTagline && <span className="kh-lockup__tag">{tagline}</span>}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className="kh-lockup">
        {inner}
      </a>
    );
  }
  return <span className="kh-lockup">{inner}</span>;
}

export default AtomMark;
