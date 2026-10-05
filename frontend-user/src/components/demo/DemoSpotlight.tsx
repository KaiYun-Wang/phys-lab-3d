"use client";

import { useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };

const PAD = 6;

/**
 * 目标是否处于「可见」状态：
 * - 元素已卸载 / display:none（尺寸为 0）→ 不显示
 * - 位于 aria-hidden 的侧栏里（控制台收起 / 面板关闭）→ 不显示
 * - 被滚动容器裁出可视区 → 不显示
 */
function measureVisible(el: HTMLElement): Rect | null {
  if (!el.isConnected) return null;
  if (el.closest('[aria-hidden="true"]')) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return null;
  const clip = el.closest(".exp-panel-scroll");
  if (clip) {
    const c = clip.getBoundingClientRect();
    if (r.bottom < c.top || r.top > c.bottom || r.right < c.left || r.left > c.right) return null;
  }
  return {
    x: r.left - PAD,
    y: r.top - PAD,
    w: Math.max(r.width + PAD * 2, 24),
    h: Math.max(r.height + PAD * 2, 24),
  };
}

/**
 * Moving frame highlight (no dim mask).
 *
 * 持续跟踪 [data-demo-id] 目标：侧栏拖宽、收起、面板切换、滚动或窗口变化时，
 * 高亮框都跟着走；目标隐藏时自动淡出。位移/尺寸由 CSS transition 平滑。
 */
export function DemoSpotlight({ demoId }: { demoId: string | null }) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!demoId) {
      visibleRef.current = false;
      setVisible(false);
      // keep last rect briefly so exit fade can run
      const t = window.setTimeout(() => setRect(null), 280);
      return () => clearTimeout(t);
    }

    let last: Rect | null = null;
    let settled = false;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const el = document.querySelector(`[data-demo-id="${demoId}"]`) as HTMLElement | null;
      const to = el ? measureVisible(el) : null;
      if (!to) {
        last = null;
        settled = false;
        visibleRef.current = false;
        setVisible(false);
        return;
      }
      if (!last) {
        last = to;
        settled = false;
        if (visibleRef.current) {
          // 仍在展示中（切换步骤）：径直滑向新目标，尺寸随之变化
          setRect(to);
        } else {
          // 从隐藏中重新出现：先在目标中心的小框展开
          setRect({ x: to.x + to.w / 2 - 40, y: to.y + to.h / 2 - 24, w: 80, h: 48 });
        }
        visibleRef.current = true;
        setVisible(true);
        return;
      }
      const moved =
        Math.abs(to.x - last.x) > 0.5 ||
        Math.abs(to.y - last.y) > 0.5 ||
        Math.abs(to.w - last.w) > 0.5 ||
        Math.abs(to.h - last.h) > 0.5;
      if (moved) {
        last = to;
        settled = false;
        setRect(to);
      } else if (!settled) {
        // 目标已就位：把框精确对齐一次后进入静默（避免每帧 setState）
        settled = true;
        setRect(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [demoId]);

  if (!rect) return null;

  return (
    <div
      className={`demo-frame${visible ? " is-on" : ""}`}
      aria-hidden
      style={{
        transform: `translate(${rect.x}px, ${rect.y}px)`,
        width: rect.w,
        height: rect.h,
      }}
    />
  );
}
