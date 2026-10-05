"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** 目标值；null 时显示占位「–」（数据未就绪） */
  value: number | null;
  /** 增长时长（毫秒） */
  duration?: number;
  /** 开始前延迟（多张读数错峰用，毫秒） */
  delay?: number;
};

/**
 * 「连击式」数字增长：从 0（或上一次的值）快速爬升到目标值，
 * 抵达后膨胀一下回弹定格（见 globals.css .anim-num.is-pop）。
 */
export default function AnimatedNumber({ value, duration = 1400, delay = 0 }: Props) {
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

    const tick = (now: number) => {
      if (now < startedAt) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const t = Math.min(1, (now - startedAt) / duration);
      // easeOutExpo：起步快、后段收束，像连击数字快速翻滚
      const eased = t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        setDisplay(value);
        setPop(true);
        popTimer.current = window.setTimeout(() => setPop(false), 460);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(popTimer.current);
    };
  }, [value, duration, delay]);

  if (display === null) {
    return <span className="anim-num">–</span>;
  }

  return <span className={`anim-num${pop ? " is-pop" : ""}`}>{Math.round(display)}</span>;
}
