"use client";

import { useId } from "react";

/**
 * 实验卡片封面示意图。
 *
 * 设计稿的每张卡片都有一幅「技术示意」预览图（双缝干涉条纹、文丘里管、
 * 光锥、测地线、横/纵波、声波阵面、透镜光路、光电管），而不是纯色占位。
 * 这里按实验 route 逐一手绘为 SVG，配色沿用 Kinetic Horizon（蓝 → 青）。
 */

const STROKE = "#22d3ee";
const STROKE_SOFT = "rgba(34,211,238,.45)";
const ACCENT = "#a5b4fc";
const WARM = "#fbbf24";

type Props = {
  route: string;
  /** 居中叠加的实验名；留空则不渲染（轮播卡自带标题时用） */
  title?: string;
  className?: string;
};

function Grid({ id }: { id: string }) {
  return (
    <>
      <defs>
        <pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="rgba(148,163,184,.12)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="320" height="200" fill={`url(#${id})`} />
    </>
  );
}

/* 1. 双缝实验：双缝 + 向两侧扩散的干涉波纹 */
function DoubleSlit() {
  const arcs: React.ReactElement[] = [];
  for (let i = 0; i < 6; i++) {
    const r = 22 + i * 21;
    for (const cx of [132, 168]) {
      arcs.push(
        <circle key={`${cx}-${i}`} cx={cx} cy="104" r={r} fill="none" stroke={STROKE} strokeWidth="1.2" opacity={0.5 - i * 0.06} />,
      );
    }
  }
  return (
    <g>
      {arcs}
      <rect x="70" y="34" width="6" height="140" fill="#0b1120" stroke={STROKE_SOFT} strokeWidth="1.2" />
      <rect x="118" y="34" width="5" height="52" fill={ACCENT} opacity="0.85" />
      <rect x="118" y="100" width="5" height="74" fill={ACCENT} opacity="0.85" />
      <rect x="172" y="34" width="5" height="52" fill={ACCENT} opacity="0.85" />
      <rect x="172" y="100" width="5" height="74" fill={ACCENT} opacity="0.85" />
      <line x1="30" y1="104" x2="66" y2="104" stroke={STROKE} strokeWidth="2" strokeDasharray="5 4" />
      <circle cx="30" cy="104" r="3.4" fill={STROKE} />
    </g>
  );
}

/* 2. 文丘里管：收缩—喉部—扩张 + 流速箭头 */
function Venturi() {
  return (
    <g>
      <path
        d="M40 62 H108 L150 92 H196 L232 62 H280 V138 H232 L196 108 H150 L108 138 H40 Z"
        fill="rgba(37,99,235,.12)"
        stroke={STROKE}
        strokeWidth="1.8"
      />
      <g stroke={STROKE_SOFT} strokeWidth="1.4" fill="none">
        <path d="M56 100 h34" />
        <path d="M104 100 h26" />
        <path d="M206 100 h40" />
      </g>
      <g fill={STROKE} opacity="0.9">
        <path d="M92 96 l8 4 -8 4 z" />
        <path d="M132 96 l8 4 -8 4 z" />
        <path d="M248 96 l8 4 -8 4 z" />
      </g>
      <line x1="160" y1="26" x2="160" y2="46" stroke={WARM} strokeWidth="1.6" strokeDasharray="4 3" />
      <line x1="112" y1="26" x2="112" y2="46" stroke={STROKE} strokeWidth="1.6" strokeDasharray="4 3" />
      <text x="112" y="20" fill={STROKE} fontSize="10" fontFamily="monospace" textAnchor="middle">P₁</text>
      <text x="160" y="20" fill={WARM} fontSize="10" fontFamily="monospace" textAnchor="middle">P₂</text>
    </g>
  );
}

/* 3. 狭义相对论：光锥 + 收缩网格 */
function LightCone() {
  return (
    <g>
      <g stroke="rgba(148,163,184,.22)" strokeWidth="1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <line key={`h${i}`} x1="30" y1={40 + i * 24} x2="290" y2={40 + i * 24} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
          <line key={`v${i}`} x1={30 + i * 26} y1="40" x2={30 + i * 26} y2="160" />
        ))}
      </g>
      <path d="M160 30 L232 160 H88 Z" fill="rgba(34,211,238,.1)" stroke={STROKE} strokeWidth="1.8" />
      <path d="M160 30 L160 160" stroke={STROKE_SOFT} strokeWidth="1.4" strokeDasharray="5 4" />
      <path d="M120 92 L200 92" stroke={ACCENT} strokeWidth="2" />
      <path d="M138 74 L182 74" stroke={ACCENT} strokeWidth="1.4" opacity="0.7" />
      <circle cx="160" cy="92" r="4" fill={WARM} />
    </g>
  );
}

/* 4. 广义相对论：测地线缠绕 + 视界 */
function BlackHole() {
  return (
    <g>
      <g fill="none" stroke={STROKE} strokeWidth="1.2" opacity="0.75">
        {[26, 40, 56, 74].map((r, i) => (
          <ellipse key={r} cx="160" cy="100" rx={r + 24} ry={r} opacity={0.85 - i * 0.14} />
        ))}
      </g>
      <circle cx="160" cy="100" r="22" fill="#04060c" stroke={ACCENT} strokeWidth="1.6" />
      <circle cx="160" cy="100" r="9" fill="#000" />
      <path d="M60 100 q100 -44 200 0" fill="none" stroke={WARM} strokeWidth="1.4" strokeDasharray="5 4" opacity="0.8" />
      <path d="M60 100 q100 44 200 0" fill="none" stroke={WARM} strokeWidth="1.4" strokeDasharray="5 4" opacity="0.5" />
    </g>
  );
}

/* 5. 横波与纵波：左正弦 / 右疏密点 */
function Waves() {
  const pts: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = 30 + (i * 120) / 40;
    const y = 100 - Math.sin((i / 40) * Math.PI * 3) * 30;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  const dots: React.ReactElement[] = [];
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const squeeze = 0.55 + 0.45 * Math.cos(t * Math.PI * 3);
    const x = 178 + t * 112 + (1 - squeeze) * 10;
    dots.push(<circle key={i} cx={x} cy="100" r={1.9 + squeeze * 1.5} fill={STROKE} opacity={0.35 + squeeze * 0.5} />);
  }
  return (
    <g>
      <line x1="30" y1="100" x2="150" y2="100" stroke="rgba(148,163,184,.3)" strokeWidth="1" strokeDasharray="4 4" />
      <path d={pts.join(" ")} fill="none" stroke={STROKE} strokeWidth="2" />
      <line x1="178" y1="100" x2="290" y2="100" stroke="rgba(148,163,184,.3)" strokeWidth="1" strokeDasharray="4 4" />
      {dots}
    </g>
  );
}

/* 6. 多普勒效应：移动声源 + 压缩/膨胀波前 */
function Doppler() {
  const rings: React.ReactElement[] = [];
  for (let i = 5; i >= 0; i--) {
    const cx = 150 - i * 11;
    const r = 14 + i * 15;
    rings.push(
      <circle key={i} cx={cx} cy="100" r={r} fill="none" stroke={STROKE} strokeWidth="1.3" opacity={0.7 - i * 0.09} />,
    );
  }
  return (
    <g>
      {rings}
      <circle cx="150" cy="100" r="6" fill={WARM} />
      <path d="M150 100 h54" stroke={WARM} strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M200 95 l10 5 -10 5 z" fill={WARM} />
      <text x="222" y="88" fill={STROKE} fontSize="10" fontFamily="monospace">λ′</text>
      <text x="86" y="88" fill={STROKE} fontSize="10" fontFamily="monospace">λ</text>
    </g>
  );
}

/* 7. 凸透镜成像：双凸透镜 + 三条特征光线 */
function Lens() {
  return (
    <g>
      <line x1="20" y1="100" x2="300" y2="100" stroke="rgba(148,163,184,.35)" strokeWidth="1" strokeDasharray="5 4" />
      <path d="M160 34 q20 66 0 132 q-20 -66 0 -132 z" fill="rgba(34,211,238,.12)" stroke={STROKE} strokeWidth="1.8" />
      <g stroke={ACCENT} strokeWidth="1.5" fill="none">
        <path d="M60 62 L160 100 L258 148" />
        <path d="M60 62 L160 62 L258 62" opacity="0.8" />
        <path d="M60 62 L258 100" opacity="0.55" />
      </g>
      <line x1="60" y1="42" x2="60" y2="120" stroke={WARM} strokeWidth="2" />
      <path d="M60 42 l-5 8 h10 z" fill={WARM} />
      <circle cx="258" cy="100" r="3.2" fill={WARM} />
      <circle cx="160" cy="100" r="2.6" fill={STROKE} />
      <text x="46" y="136" fill={WARM} fontSize="10" fontFamily="monospace">u</text>
      <text x="204" y="136" fill={STROKE} fontSize="10" fontFamily="monospace">v</text>
    </g>
  );
}

/* 8. 光电效应：光子入射 + 光电子逸出 */
function Photoelectric() {
  return (
    <g>
      <rect x="52" y="46" width="10" height="108" fill="rgba(165,180,252,.25)" stroke={ACCENT} strokeWidth="1.4" />
      <rect x="248" y="46" width="10" height="108" fill="rgba(148,163,184,.18)" stroke="rgba(148,163,184,.5)" strokeWidth="1.4" />
      <g stroke={STROKE} strokeWidth="1.6">
        <path d="M74 74 h44" />
        <path d="M74 100 h44" />
        <path d="M74 126 h44" />
      </g>
      <g fill={STROKE}>
        <circle cx="122" cy="74" r="3" />
        <circle cx="122" cy="100" r="3" />
        <circle cx="122" cy="126" r="3" />
      </g>
      <path d="M150 74 h22" stroke={WARM} strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M150 100 h22" stroke={WARM} strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M150 126 h22" stroke={WARM} strokeWidth="1.6" strokeDasharray="4 3" />
      <path d="M214 84 q18 -18 30 -26" fill="none" stroke={STROKE} strokeWidth="1.6" />
      <path d="M214 116 q18 18 30 26" fill="none" stroke={STROKE} strokeWidth="1.6" />
      <circle cx="180" cy="100" r="2.4" fill={ACCENT} />
    </g>
  );
}

const SCHEMATICS: Record<string, () => React.ReactElement> = {
  "double-slit": DoubleSlit,
  "bernoulli-venturi": Venturi,
  "special-relativity": LightCone,
  "general-relativity": BlackHole,
  "wave-mechanics": Waves,
  doppler: Doppler,
  "convex-lens": Lens,
  photoelectric: Photoelectric,
};

export default function ExperimentThumbnail({ route, title, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const Schematic = SCHEMATICS[route];
  const clipId = `thumb-clip-${uid}`;
  const fadeId = `thumb-fade-${uid}`;

  return (
    <div className={`kh-thumb${className ? ` ${className}` : ""}`}>
      <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="presentation">
        <defs>
          <clipPath id={clipId}>
            <rect width="320" height="200" />
          </clipPath>
          <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="45%" stopColor="rgba(6,10,20,0)" />
            <stop offset="100%" stopColor="rgba(6,10,20,.92)" />
          </linearGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <rect width="320" height="200" fill="#070b14" />
          <Grid id={`thumb-grid-${uid}`} />
          <g opacity="0.95">{Schematic ? <Schematic /> : <DefaultSchema />}</g>
          <rect width="320" height="200" fill={`url(#${fadeId})`} />
        </g>
      </svg>

      {/* 居中叠加的实验名（设计稿：预览图内直接压标题） */}
      {title ? <span className="kh-thumb__title">{title}</span> : null}
      <span className="kh-thumb__scan" aria-hidden />
    </div>
  );
}

/** 未登记的 route 用一组通用轨道示意兜底 */
function DefaultSchema() {
  return (
    <g fill="none" stroke={STROKE} strokeWidth="1.4">
      <ellipse cx="160" cy="100" rx="34" ry="66" />
      <ellipse cx="160" cy="100" rx="34" ry="66" transform="rotate(60 160 100)" />
      <ellipse cx="160" cy="100" rx="34" ry="66" transform="rotate(120 160 100)" />
      <circle cx="160" cy="100" r="4" fill={STROKE} stroke="none" />
    </g>
  );
}
