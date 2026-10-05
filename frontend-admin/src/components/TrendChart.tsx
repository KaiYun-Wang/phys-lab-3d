"use client";

import { useEffect, useRef, useState } from "react";
import { playHoverTick } from "@/lib/uiSound";

type Point = { date: string; count: number };

type Props = {
  data: Point[];
  color?: string;
  height?: number;
};

function formatLabel(date: string) {
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${Number(parts[1])}/${Number(parts[2])}`;
}

/** 纵轴刻度：4 段整数刻度，最大值向上取整到「好看」的步长 */
function niceStep(max: number, divisions = 4) {
  const raw = Math.max(1, max / divisions);
  if (raw < 10) return Math.ceil(raw);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

export default function TrendChart({ data, color = "var(--accent)", height = 160 }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const [lastIdx, setLastIdx] = useState(0);
  const [drawId, setDrawId] = useState(0);
  const lineRef = useRef<SVGPathElement>(null);
  const width = 560;
  const padL = 34;
  const padR = 12;
  const padY = 16;
  const innerW = width - padL - padR;
  const innerH = height - padY * 2;

  const dataMax = Math.max(1, ...data.map((d) => d.count));
  const step = niceStep(dataMax);
  const top = step * 4;
  const ticks = [0, step, step * 2, step * 3, top];

  const xOf = (i: number) => padL + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yOf = (count: number) => padY + innerH - (count / top) * innerH;

  const coords = data.map((d, i) => ({ x: xOf(i), y: yOf(d.count), ...d }));

  const line =
    coords.length === 0
      ? ""
      : coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");

  const area =
    coords.length === 0
      ? ""
      : `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const labelStep = data.length > 14 ? 5 : data.length > 8 ? 2 : 1;

  // 数据变化（含 7/30 天切换）→ 重放描线动画
  useEffect(() => {
    setDrawId((v) => v + 1);
  }, [data]);

  useEffect(() => {
    const path = lineRef.current;
    if (!path) return;
    const len = path.getTotalLength();
    if (!Number.isFinite(len) || len <= 0) return;
    path.style.transition = "none";
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        path.style.transition = "stroke-dashoffset 0.9s cubic-bezier(0.25, 0.9, 0.3, 1)";
        path.style.strokeDashoffset = "0";
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [drawId]);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    if (coords.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const chartX = ((e.clientX - rect.left) / rect.width) * width;
    let nearest = 0;
    for (let i = 1; i < coords.length; i += 1) {
      if (Math.abs(coords[i].x - chartX) < Math.abs(coords[nearest].x - chartX)) nearest = i;
    }
    // 命中节点切换：轻「嗒」（内部 45ms 限流，快速扫过连成刻度声）
    if (nearest !== hover) playHoverTick();
    setHover(nearest);
    setLastIdx(nearest);
  }

  // 离开时停留在最后位置淡出（避免回跳），悬停期间线性跟随
  const activeIdx = Math.min(hover ?? lastIdx, Math.max(0, coords.length - 1));
  const active = coords[activeIdx];

  return (
    <div className="trend-chart">
      <div
        className="trend-chart__plot"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="趋势图">
          {/* 纵轴网格与刻度 */}
          {ticks.map((t, i) => {
            const y = yOf(t);
            const last = i === ticks.length - 1;
            return (
              <line
                key={t}
                x1={padL}
                y1={y}
                x2={width - padR}
                y2={y}
                stroke="var(--border-hairline)"
                strokeWidth="1"
                opacity={last ? 1 : 0.45}
              />
            );
          })}
          <line x1={padL} y1={padY} x2={padL} y2={padY + innerH} stroke="var(--border-hairline)" strokeWidth="1" opacity="0.6" />
          {ticks.map((t) => (
            <text
              key={t}
              className="trend-chart__tick"
              x={padL - 7}
              y={yOf(t) + 3}
              textAnchor="end"
            >
              {t}
            </text>
          ))}

          <path key={`area-${drawId}`} className="trend-chart__area" d={area} fill={color} />
          {line && (
            <path
              key={`line-${drawId}`}
              ref={lineRef}
              className="trend-chart__line"
              d={line}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {coords.map((c, i) => (
            <circle
              key={`${c.date}-${drawId}`}
              className={`trend-chart__dot${hover === i ? " is-hot" : ""}`}
              style={{ animationDelay: `${Math.min(i, 18) * 0.045}s` }}
              cx={c.x}
              cy={c.y}
              r="2.5"
              fill={color}
            />
          ))}

          {/* 悬浮指示线 + 节点：整体平移，CSS 过渡出 Q 弹跟随 */}
          {active ? (
            <g
              className="trend-chart__hover"
              style={{
                opacity: hover !== null ? 1 : 0,
                transform: `translateX(${active.x.toFixed(1)}px)`,
              }}
            >
              <line
                x1={0}
                y1={padY}
                x2={0}
                y2={padY + innerH}
                stroke={color}
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.55"
              />
              <circle
                className="trend-chart__hover-dot"
                cx={0}
                cy={0}
                r="4.5"
                fill={color}
                stroke="var(--surface-panel)"
                strokeWidth="2"
                style={{ transform: `translateY(${active.y.toFixed(1)}px)` }}
              />
            </g>
          ) : null}
        </svg>

        {/* 悬浮数值卡：只显示纵轴数值 */}
        {active ? (
          <div
            className={`trend-chart__tip${hover !== null ? " is-on" : ""}`}
            style={{
              left: `${(active.x / width) * 100}%`,
              top: `${(active.y / height) * 100}%`,
            }}
          >
            <span className="trend-chart__tip-value" style={{ color }}>
              {active.count}
            </span>
          </div>
        ) : null}
      </div>

      <div className="trend-chart__labels">
        {data.map((d, i) =>
          i % labelStep === 0 || i === data.length - 1 ? (
            <span key={d.date} style={{ left: `${data.length <= 1 ? 50 : (i / (data.length - 1)) * 100}%` }}>
              {formatLabel(d.date)}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}
