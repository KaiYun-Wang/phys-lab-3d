"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  active?: boolean;
  onOpen: () => void;
  onRename: (title: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
};

export function SessionHistoryItem({ title, active, onOpen, onRename, onDelete }: Props) {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rowHot, setRowHot] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [busy, setBusy] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const [looping, setLooping] = useState(false);
  const [loopDur, setLoopDur] = useState(8);

  useEffect(() => {
    if (!renaming) setDraft(title);
  }, [title, renaming]);

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
  }, [title, renaming]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
        // 点外面关菜单时，若鼠标已不在行上则收起更多按钮
        const row = (e.target as HTMLElement)?.closest?.(".ai-sess-row");
        if (!row) setRowHot(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const stopMarquee = () => setLooping(false);

  const startMarquee = () => {
    if (renaming || menuOpen) return;
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track) return;
    const overflow = track.scrollWidth / 2 - wrap.clientWidth;
    setOverflowing(overflow > 4);
    if (overflow <= 4) return;
    // 双份内容回环：单圈时长按半程宽度估算
    const half = track.scrollWidth / 2;
    setLoopDur(Math.min(16, Math.max(2.5, half / 30)));
    setLooping(true);
  };

  const commitRename = async () => {
    const next = draft.trim();
    if (!next || next === title) {
      setRenaming(false);
      setDraft(title);
      return;
    }
    setBusy(true);
    try {
      await onRename(next.slice(0, 200));
      setRenaming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`ai-sess-row${active ? " is-active" : ""}${menuOpen ? " is-menu-open" : ""}${rowHot ? " is-hot" : ""}${overflowing ? " is-overflow" : ""}`}
      onMouseEnter={() => {
        setRowHot(true);
        startMarquee();
      }}
      onMouseLeave={() => {
        if (!menuOpen) {
          setRowHot(false);
          stopMarquee();
        }
      }}
    >
      <button
        type="button"
        className="ai-sess-main"
        onClick={() => {
          if (!renaming) onOpen();
        }}
      >
        <span className="ai-sess-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        </span>
        {renaming ? (
          <input
            className="ai-sess-rename"
            value={draft}
            autoFocus
            disabled={busy}
            maxLength={200}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void commitRename();
              } else if (e.key === "Escape") {
                setRenaming(false);
                setDraft(title);
              }
            }}
          />
        ) : (
          <span className="ai-sess-title-wrap" ref={wrapRef}>
            <span
              className={`ai-sess-title-track${looping ? " is-looping" : ""}`}
              ref={trackRef}
              style={looping ? { animationDuration: `${loopDur}s` } : undefined}
            >
              <span className="ai-sess-title-seg">{title || "新对话"}</span>
              <span className="ai-sess-title-seg" aria-hidden>
                {title || "新对话"}
              </span>
            </span>
          </span>
        )}
      </button>

      <div className="ai-sess-more" ref={menuRef}>
        <button
          type="button"
          className="ai-sess-more-btn"
          data-tooltip="更多"
          aria-label="更多操作"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.stopPropagation();
            stopMarquee();
            setMenuOpen((v) => !v);
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="6" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="18" cy="12" r="1.6" />
          </svg>
        </button>
        {menuOpen ? (
          <div className="ai-sess-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                setRenaming(true);
                setDraft(title);
              }}
            >
              重命名
            </button>
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                void onDelete();
              }}
            >
              删除
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
