"use client";

import { useEffect, useRef, useState } from "react";

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Moving frame highlight (no dim mask).
 * Box eases from previous target to the new [data-demo-id] element.
 */
export function DemoSpotlight({ demoId }: { demoId: string | null }) {
  const [rect, setRect] = useState<Rect | null>(null);
  const [visible, setVisible] = useState(false);
  const prevRef = useRef<Rect | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    if (!demoId) {
      setVisible(false);
      // keep last rect briefly so exit fade can run
      const t = window.setTimeout(() => setRect(null), 280);
      return () => clearTimeout(t);
    }

    const el = document.querySelector(`[data-demo-id="${demoId}"]`) as HTMLElement | null;
    if (!el) {
      setVisible(false);
      return;
    }

    const measure = (): Rect => {
      const r = el.getBoundingClientRect();
      const pad = 6;
      return {
        x: r.left - pad,
        y: r.top - pad,
        w: Math.max(r.width + pad * 2, 24),
        h: Math.max(r.height + pad * 2, 24),
      };
    };

    const to = measure();
    const from =
      prevRef.current ??
      ({
        x: to.x + to.w / 2 - 40,
        y: to.y + to.h / 2 - 24,
        w: 80,
        h: 48,
      } satisfies Rect);

    setVisible(true);
    const start = performance.now();
    const dur = 420;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      // ease-out cubic
      const e = 1 - Math.pow(1 - t, 3);
      const cur: Rect = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      };
      setRect(cur);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
        setRect(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    const onResize = () => {
      const next = measure();
      prevRef.current = next;
      setRect(next);
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
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
