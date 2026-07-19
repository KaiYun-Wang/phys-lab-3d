"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAnnouncements, type Announcement } from "@/lib/api";
import AnnouncementDetailModal from "@/components/AnnouncementDetailModal";

export default function AnnouncementMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Announcement[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  async function load(nextPage: number, append: boolean) {
    setLoading(true);
    try {
      const data = await fetchAnnouncements(nextPage, 10);
      setItems((prev) => (append ? [...prev, ...(data.records ?? [])] : data.records ?? []));
      setPage(data.page);
      setTotal(data.total);
      setLoaded(true);
    } catch {
      if (!append) setItems([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !loaded && !loading) load(1, false);
  }, [open, loaded, loading]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function onScroll() {
    const el = listRef.current;
    if (!el || loading || items.length >= total) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
      load(page + 1, true);
    }
  }

  function openDetail(item: Announcement) {
    setDetail(item);
    setOpen(false);
  }

  return (
    <>
      <div className="announcement-menu" ref={rootRef}>
        <button
          type="button"
          className="sx-eyebrow text-white hover:opacity-80 transition-opacity bg-transparent border-0 cursor-pointer p-0"
          onClick={() => setOpen((v) => !v)}
        >
          公告
        </button>
        {open ? (
          <div className="announcement-popover" role="dialog" aria-label="公告">
            <div className="announcement-popover-head">
              <span className="sx-eyebrow">最近公告</span>
            </div>
            <div ref={listRef} className="announcement-popover-list" onScroll={onScroll}>
              {!loaded && loading ? (
                <p className="sx-hint">加载中…</p>
              ) : items.length === 0 ? (
                <p className="sx-hint">暂无公告</p>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="announcement-item-btn"
                    onClick={() => openDetail(item)}
                  >
                    {item.title}
                  </button>
                ))
              )}
              {loaded && loading ? <p className="sx-hint">加载更多…</p> : null}
            </div>
          </div>
        ) : null}
      </div>
      {detail ? (
        <AnnouncementDetailModal announcement={detail} onClose={() => setDetail(null)} />
      ) : null}
    </>
  );
}
