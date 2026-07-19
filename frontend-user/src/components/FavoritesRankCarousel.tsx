"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
        <h2 className="sx-rank-title">收藏榜 · Top 5</h2>
        {n > 1 && <span className="sx-rank-hint">拖拽 / 滑动切换</span>}
      </div>

      {n > 1 && (
        <>
          <button type="button" className="sx-rank-nav prev" onClick={prev} aria-label="上一张">
            ‹
          </button>
          <button type="button" className="sx-rank-nav next" onClick={next} aria-label="下一张">
            ›
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
          const x = d * 56 + extra;
          const z = -abs * 70;
          const rotY = d * -14;
          const rotX = d === 0 ? 6 : 8;
          const scale = d === 0 ? 1 : Math.max(0.78, 1 - abs * 0.08);

          let depth = "is-far";
          if (d === 0) depth = "is-active";
          else if (d === 1) depth = "is-next";
          else if (d === -1) depth = "is-prev";

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
              aria-hidden={d !== 0}
              tabIndex={d === 0 ? 0 : -1}
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
                  <div className="sx-float-fallback" aria-hidden>
                    <span>{exp.title}</span>
                  </div>
                )}
              </div>
              <div className="sx-float-veil" />
              <div className="sx-float-body">
                <p className="sx-float-rank">
                  No. <b>0{i + 1}</b> · {experimentSubjectLabel(exp)}
                </p>
                <h3>{exp.title}</h3>
                <p className="sx-float-meta">{exp.favoriteCount ?? 0} 次收藏</p>
              </div>
            </a>
          );
        })}
      </div>

      {n > 1 && (
        <div className="sx-rank-dots" aria-hidden>
          {top5.map((exp, i) => (
            <button
              key={exp.id}
              type="button"
              className={`sx-rank-dot${i === index ? " is-on" : ""}`}
              onClick={() => go(i)}
              aria-label={`第 ${i + 1} 名`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
