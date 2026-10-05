"use client";

import { useCallback, useEffect, useState, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { fetchAnnouncements, type Announcement } from "@/lib/api";
import AnnouncementCard from "@/components/AnnouncementCard";

/** 弹框内每页条数（滚到底自动加载下一页） */
const PAGE_SIZE = 10;

/**
 * 「全部公告」浮层：与个人中心「全部 AI 对话」同款 Surface-2 玻璃弹框，
 * 内部滚动分页加载；点击条目在弹框上层打开详情。
 */
export default function AnnouncementAllModal({
  onClose,
  onOpenDetail,
}: {
  onClose: () => void;
  onOpenDetail: (item: Announcement) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  useEffect(() => setMounted(true), []);

  // 打开时拉第一页
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchAnnouncements(1, PAGE_SIZE);
        if (cancelled) return;
        const recs = res.records ?? [];
        setRows(recs);
        setTotal(res.total ?? recs.length);
        setExhausted(recs.length >= (res.total ?? recs.length));
      } catch {
        /* 保持空列表 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchAnnouncements(next, PAGE_SIZE);
      const recs = res.records ?? [];
      setRows((prev) => {
        const merged = [...prev, ...recs.filter((r) => !prev.some((x) => x.id === r.id))];
        if (merged.length >= (res.total ?? merged.length)) setExhausted(true);
        return merged;
      });
      setPage(next);
    } catch {
      /* 静默失败：下次滚动会重试 */
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, exhausted, page]);

  const onScroll = useCallback(
    (e: UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32) void loadMore();
    },
    [loadMore],
  );

  // ESC 关闭；锁定背景滚动
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="pf-modal-mask" onClick={onClose}>
      <div
        className="pf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="全部公告"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pf-modal__head">
          <span className="pf-card__t">
            <i className="fa-regular fa-bell pf-ic--sky" aria-hidden />
            全部公告
            {total > 0 ? <em className="pf-pill">{total}</em> : null}
          </span>
          <button type="button" className="pf-modal__close" onClick={onClose} aria-label="关闭">
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </header>
        <div className="pf-modal__body" onScroll={onScroll}>
          {loading ? (
            <p className="pf-empty">加载中…</p>
          ) : rows.length === 0 ? (
            <p className="pf-empty">暂无公告</p>
          ) : (
            <>
              <div className="announcement-all-list">
                {rows.map((item) => (
                  <AnnouncementCard key={item.id} item={item} onClick={() => onOpenDetail(item)} />
                ))}
              </div>
              {loadingMore ? <p className="pf-modal__more">加载中…</p> : null}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
