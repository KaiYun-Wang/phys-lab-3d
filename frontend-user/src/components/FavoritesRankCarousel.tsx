"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, Star } from "lucide-react";
import ExperimentThumbnail from "@/components/ExperimentThumbnail";
import {
  experimentCoverSrc,
  experimentSubjectLabel,
  type Experiment,
} from "@/lib/api";

type Props = {
  experiments: Experiment[];
};

function rankOffset(i: number, index: number, n: number) {
  let d = i - index;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

/**
 * 轮播卡片上的参数行。
 *
 * 设计稿此处是 `λ = 532 nm · 双缝间距 d = 0.25mm`，但那是虚构数值，且与平台
 * 实际参数冲突（双缝无波长滑块、λ≈500nm、d 为 0.5–5mm），故不照抄。
 * 这里用实验自身的 topics 拼一行真实标签；若后端补 `specLine` 字段，替换此处即可。
 */
function specLineFor(exp: Experiment): string | null {
  const real = exp.topics?.filter(Boolean) ?? [];
  if (real.length === 0) return null;
  return real.slice(0, 2).join(" · ");
}

export default function FavoritesRankCarousel({ experiments }: Props) {
  const top5 = useMemo(
    () =>
      [...experiments]
        .sort((a, b) => (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0))
        .slice(0, 5),
    [experiments],
  );

  const n = top5.length;
  const [index, setIndex] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const dragAbs = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (index >= n && n > 0) setIndex(0);
  }, [n, index]);

  const go = useCallback(
    (i: number) => {
      if (n === 0) return;
      setIndex(((i % n) + n) % n);
      setDragX(0);
    },
    [n],
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (n < 2 || reduceMotion.current) return;
    const id = window.setInterval(() => {
      if (stageRef.current?.matches(":hover")) return;
      setIndex((i) => (i + 1) % n);
    }, 4200);
    return () => clearInterval(id);
  }, [n]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (n < 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    startX.current = e.clientX;
    dragAbs.current = 0;
    setDragging(true);
    setDragX(0);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    dragAbs.current = Math.abs(dx);
    setDragX(dx);
  };

  const onPointerUp = () => {
    if (!dragging) return;
    setDragging(false);
    if (dragX > 70) prev();
    else if (dragX < -70) next();
    else setDragX(0);
  };

  if (n === 0) return null;

  return (
    <div className="sx-rank">
      <div className="sx-rank-head">
        <div className="sx-rank-head__left">
          <span className="sx-rank-ping" aria-hidden>
            <span className="sx-rank-ping__wave" />
            <span className="sx-rank-ping__core" />
          </span>
          <h2 className="sx-rank-title">收藏榜 · TOP 5</h2>
          <span className="sx-rank-hot">热度巅峰</span>
        </div>
        {n > 1 && <span className="sx-rank-hint">拖拽 / 滑动切换</span>}
      </div>

      <div className="sx-rank-viewport">
        {n > 1 && (
          <>
            <button type="button" className="sx-rank-nav prev" onClick={prev} aria-label="上一个">
              <ChevronLeft size={16} aria-hidden />
            </button>
            <button type="button" className="sx-rank-nav next" onClick={next} aria-label="下一个">
              <ChevronRight size={16} aria-hidden />
            </button>
          </>
        )}

        <div
          ref={stageRef}
          className={`sx-rank-stage${dragging ? " is-dragging" : ""}`}
          role="region"
          aria-roledescription="carousel"
          aria-label="收藏榜前五实验"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") next();
            if (e.key === "ArrowLeft") prev();
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {top5.map((exp, i) => {
            const d = rankOffset(i, index, n);
            const cover = experimentCoverSrc(exp.coverUrl);
            const abs = Math.abs(d);
            const extra = dragging ? dragX * (d === 0 ? 0.55 : 0.15) : 0;
            // 后方卡片左右拉开更多、缩放更小，保证露出的部分清晰可辨
            const x = d * 104 + extra;
            const z = -abs * 52;
            const rotY = d * -12;
            const rotX = d === 0 ? 6 : 7;
            const scale = d === 0 ? 1 : Math.max(0.88, 1 - abs * 0.05);

            let depth = "is-far";
            if (d === 0) depth = "is-active";
            else if (d === 1) depth = "is-next";
            else if (d === -1) depth = "is-prev";

            const spec = specLineFor(exp);
            const isActive = d === 0;

            return (
              <a
                key={exp.id}
                href={`/experiments/${exp.route}`}
                className={`sx-float-card ${depth}`}
                style={{
                  transform: `translateX(${x}px) translateZ(${z}px) rotateY(${rotY}deg) rotateX(${rotX}deg) scale(${scale})`,
                  transition: dragging ? "none" : undefined,
                }}
                draggable={false}
                onClick={(e) => {
                  if (dragAbs.current > 8) e.preventDefault();
                }}
                aria-label={`第 ${i + 1} 名 ${exp.title}`}
                aria-hidden={!isActive}
                tabIndex={isActive ? 0 : -1}
              >
                <div className="sx-float-cover">
                  {cover ? (
                    <Image
                      src={cover}
                      alt=""
                      fill
                      sizes="380px"
                      className="object-cover"
                      draggable={false}
                      unoptimized={cover.startsWith("http")}
                    />
                  ) : (
                    /* 无封面时铺该实验的技术示意图，避免预览窗留空 */
                    <ExperimentThumbnail route={exp.route} />
                  )}

                  {/* 预览窗内的覆盖层 */}
                  <span className="kh-card-grid" aria-hidden />
                  {isActive && (
                    <span className="kh-ripples" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                  )}
                  <span className="sx-float-veil" aria-hidden />

                  {/* 中央：参数行 + 标题 */}
                  <span className="sx-float-center">
                    {spec && <span className="sx-float-spec">{spec}</span>}
                    <span className="sx-float-heading">
                      <span className="sx-float-heading__text">{exp.title}</span>
                      <ExternalLink size={13} aria-hidden />
                    </span>
                  </span>
                </div>

                {/* 底部信息条 */}
                <span className="sx-float-bar">
                  <span className="sx-float-bar__left">
                    <span className="sx-float-no">NO. {String(i + 1).padStart(2, "0")}</span>
                    <span className="sx-float-subject">{experimentSubjectLabel(exp)}</span>
                    <span className="sx-float-div" aria-hidden>
                      |
                    </span>
                    <span className="sx-float-name">{exp.title}</span>
                  </span>
                  <span className="sx-float-fav">
                    <Star size={13} fill="currentColor" aria-hidden />
                    {exp.favoriteCount ?? 0} 次收藏
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {n > 1 && (
        <div className="sx-rank-dots">
          {top5.map((exp, i) => (
            <button
              key={exp.id}
              type="button"
              className={`sx-rank-dot${i === index ? " is-on" : ""}`}
              onClick={() => go(i)}
              aria-label={`第 ${i + 1} 名`}
              aria-current={i === index}
            />
          ))}
        </div>
      )}
    </div>
  );
}
