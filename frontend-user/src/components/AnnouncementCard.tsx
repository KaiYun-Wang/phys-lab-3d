"use client";

import { useEffect, useRef, useState } from "react";
import type { Announcement } from "@/lib/api";
import { formatChatTime } from "@/lib/time";

/** 公告条目卡：图标（管理端配置）+ 标题 + mono 时间 + 描述（溢出时悬停滚动播放） */
export default function AnnouncementCard({
  item,
  onClick,
}: {
  item: Announcement;
  onClick: () => void;
}) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [looping, setLooping] = useState(false);
  const [loopDur, setLoopDur] = useState(10);

  const desc = item.description?.trim() ?? "";

  useEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const track = trackRef.current;
      const seg = (track?.firstElementChild as HTMLElement | null) ?? null;
      if (!wrap || !seg) {
        setOverflowing(false);
        return;
      }
      // 只比较文案净宽（不含尾部回环间隔）：整段放得下就不算溢出、不滚动
      const gap = parseFloat(getComputedStyle(seg).paddingRight) || 0;
      setOverflowing(seg.offsetWidth - gap - wrap.clientWidth > 4);
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (wrapRef.current && ro) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [desc]);

  const stopMarquee = () => setLooping(false);

  const startMarquee = () => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const seg = (track?.firstElementChild as HTMLElement | null) ?? null;
    if (!wrap || !seg) return;
    // 文案净宽（不含尾部间隔）超出可视宽才滚动
    const gap = parseFloat(getComputedStyle(seg).paddingRight) || 0;
    const overflow = seg.offsetWidth - gap - wrap.clientWidth;
    setOverflowing(overflow > 4);
    if (overflow <= 4) return;
    // 双份内容回环：单圈时长按单份宽度（含间隔）估算
    const copyW = seg.offsetWidth;
    setLoopDur(Math.min(18, Math.max(2.8, copyW / 28)));
    setLooping(true);
  };

  return (
    <button
      type="button"
      className={`announcement-card${overflowing ? " is-overflow" : ""}`}
      onClick={onClick}
      onMouseEnter={startMarquee}
      onMouseLeave={stopMarquee}
    >
      {item.icon ? (
        <span className="announcement-card__ico" aria-hidden>
          <i className={`fa-solid ${item.icon}`} />
        </span>
      ) : null}
      <span className="announcement-card__main">
        <span className="announcement-card__top">
          <b className="announcement-card__title">{item.title}</b>
          <em className="announcement-card__time">{formatChatTime(item.createTime)}</em>
        </span>
        {desc ? (
          <span className="announcement-card__desc-wrap" ref={wrapRef}>
            <span
              className={`announcement-card__desc-track${looping ? " is-looping" : ""}`}
              ref={trackRef}
              style={looping ? { animationDuration: `${loopDur}s` } : undefined}
            >
              <span className="announcement-card__desc-seg">{desc}</span>
              {looping ? (
                <span className="announcement-card__desc-seg" aria-hidden>
                  {desc}
                </span>
              ) : null}
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
