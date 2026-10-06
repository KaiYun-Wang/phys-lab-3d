"use client";

import { useEffect, useRef, useState } from "react";
import { fetchAnnouncements, type Announcement } from "@/lib/api";
import AnnouncementDetailModal from "@/components/AnnouncementDetailModal";
import AnnouncementAllModal from "@/components/AnnouncementAllModal";
import AnnouncementCard from "@/components/AnnouncementCard";

/** 预览条数：最多展示 5 条，超出走「查看全部」弹框（与个人中心最近对话一致） */
const RECENT_LIMIT = 5;

export default function AnnouncementMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [detail, setDetail] = useState<Announcement | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchAnnouncements(1, RECENT_LIMIT);
      setItems(data.records ?? []);
      setTotal(data.total);
    } catch {
      setItems([]);
    } finally {
      setLoaded(true);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open && !loaded && !loading) void load();
  }, [open, loaded, loading]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function openDetail(item: Announcement) {
    setDetail(item);
    setOpen(false);
  }

  return (
    <>
      <div className="announcement-menu" ref={rootRef}>
        <button
          type="button"
          className={`kh-announce${open ? " is-open" : ""}`}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="公告"
          data-tooltip="公告"
          onClick={() => setOpen((v) => !v)}
        >
          <i className="fa-regular fa-bell kh-announce__icon" aria-hidden />
        </button>
        {open ? (
          <div className="announcement-popover" role="dialog" aria-label="公告">
            <div className="announcement-popover-head">
              <span className="sx-eyebrow">最近公告</span>
              {loaded && total > 0 ? (
                <span className="announcement-popover-count">{`共 ${total} 条`}</span>
              ) : null}
            </div>
            <div className="announcement-popover-list">
              {!loaded && loading ? (
                <p className="sx-hint">加载中…</p>
              ) : items.length === 0 ? (
                <div className="announcement-empty">
                  <i className="fa-regular fa-folder-open" aria-hidden />
                  <p>暂无公告</p>
                </div>
              ) : (
                items.map((item) => (
                  <AnnouncementCard key={item.id} item={item} onClick={() => openDetail(item)} />
                ))
              )}
            </div>
            {loaded && total > RECENT_LIMIT ? (
              <div className="announcement-popover-foot">
                <button
                  type="button"
                  className="pf-link"
                  onClick={() => {
                    setOpen(false);
                    setAllOpen(true);
                  }}
                >
                  查看全部 {total} 条公告
                  <i className="fa-solid fa-arrow-right" aria-hidden />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {detail ? (
        <AnnouncementDetailModal announcement={detail} onClose={() => setDetail(null)} />
      ) : null}
      {allOpen ? (
        <AnnouncementAllModal
          onClose={() => setAllOpen(false)}
          onOpenDetail={(item) => setDetail(item)}
        />
      ) : null}
    </>
  );
}
