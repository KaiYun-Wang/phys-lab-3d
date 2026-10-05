"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** 目标值；null 时显示占位「—」 */
  value: number | null;
  /** 增长时长（毫秒） */
  duration?: number;
  /** 开始前延迟（排行榜错峰用，毫秒） */
  delay?: number;
  /** 小数位；缺省时按目标值自动（整数 0 位、小数 1 位） */
  decimals?: number;
};

/**
 * 「连击式」数字增长：从 0（或上一次的值）快速爬升到目标值，
 * 抵达后膨胀一下回弹定格（见 admin.css .anim-num.is-pop）。
 */
export default function AnimatedNumber({ value, duration = 1400, delay = 0, decimals }: Props) {
  const [display, setDisplay] = useState<number | null>(null);
  const [pop, setPop] = useState(false);
  const fromRef = useRef(0);
  const rafRef = useRef(0);
  const popTimer = useRef(0);

  useEffect(() => {
    if (value === null) {
      setDisplay(null);
      return;
    }
    const from = fromRef.current;
    const startedAt = performance.now() + delay;
    let raf = 0;

    const tick = (now: number) => {
      if (now < startedAt) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startedAt) / duration);
      // easeOutExpo：起步快、后段收束，像连击数字快速翻滚
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        setDisplay(value);
        setPop(true);
        popTimer.current = window.setTimeout(() => setPop(false), 460);
      }
    };

    raf = requestAnimationFrame(tick);
    rafRef.current = raf;
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(popTimer.current);
    };
  }, [value, duration, delay]);

  if (display === null) {
    return <span className="anim-num">—</span>;
  }

  const digits = decimals ?? (Number.isInteger(value) ? 0 : 1);
  const text = digits > 0 ? display.toFixed(digits) : String(Math.round(display));

  return <span className={`anim-num${pop ? " is-pop" : ""}`}>{text}</span>;
}
