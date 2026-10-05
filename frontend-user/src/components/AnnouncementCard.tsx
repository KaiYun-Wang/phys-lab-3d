"use client";

import type { Announcement } from "@/lib/api";
import { formatChatTime } from "@/lib/time";

/** 公告条目卡：图标（管理端配置）+ 标题 + mono 时间（下拉预览与「查看全部」弹框共用） */
export default function AnnouncementCard({
  item,
  onClick,
}: {
  item: Announcement;
  onClick: () => void;
}) {
  return (
    <button type="button" className="announcement-card" onClick={onClick}>
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
      </span>
    </button>
  );
}
