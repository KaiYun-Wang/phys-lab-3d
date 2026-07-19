"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import type { Announcement } from "@/lib/api";

function formatTime(value?: string) {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function AnnouncementDetailModal({
  announcement,
  onClose,
}: {
  announcement: Announcement;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="announcement-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="announcement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="announcement-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="announcement-modal-head">
          <p className="sx-eyebrow announcement-modal-eyebrow">公告</p>
          <h2 id="announcement-detail-title" className="announcement-modal-title">
            {announcement.title}
          </h2>
          {announcement.createTime ? (
            <p className="announcement-modal-time">{formatTime(announcement.createTime)}</p>
          ) : null}
        </div>
        <div className="announcement-modal-body">{announcement.content}</div>
        <div className="announcement-modal-foot">
          <button type="button" className="btn-ghost btn-ghost-sm" onClick={onClose}>
            知道了
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
