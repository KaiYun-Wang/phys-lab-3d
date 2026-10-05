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
      if (!wrap || !track) {
        setOverflowing(false);
        return;
      }
      setOverflowing(track.scrollWidth / 2 - wrap.clientWidth > 4);
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
    if (!wrap || !track) return;
    const overflow = track.scrollWidth / 2 - wrap.clientWidth;
    setOverflowing(overflow > 4);
    if (overflow <= 4) return;
    // 双份内容回环：单圈时长按半程宽度估算
    const half = track.scrollWidth / 2;
    setLoopDur(Math.min(18, Math.max(2.8, half / 28)));
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
              <span className="announcement-card__desc-seg" aria-hidden>
                {desc}
              </span>
            </span>
          </span>
        ) : null}
      </span>
    </button>
  );
}
