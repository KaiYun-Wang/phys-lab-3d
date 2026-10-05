"use client";

import { useEffect, useRef, useState } from "react";

/** 候选图标（Font Awesome 6 Free Solid）：类名 + 中文名，存库仅存类名 */
export const ICON_OPTIONS: Array<{ icon: string; name: string }> = [
  { icon: "fa-bullhorn", name: "公告" },
  { icon: "fa-bell", name: "提醒" },
  { icon: "fa-circle-info", name: "说明" },
  { icon: "fa-lightbulb", name: "提示" },
  { icon: "fa-star", name: "重点" },
  { icon: "fa-flag", name: "里程碑" },
  { icon: "fa-rocket", name: "上线" },
  { icon: "fa-flask", name: "实验" },
  { icon: "fa-atom", name: "原理" },
  { icon: "fa-wand-magic-sparkles", name: "新功能" },
  { icon: "fa-code-branch", name: "版本" },
  { icon: "fa-screwdriver-wrench", name: "维护" },
  { icon: "fa-triangle-exclamation", name: "警告" },
  { icon: "fa-bug", name: "修复" },
  { icon: "fa-gear", name: "配置" },
  { icon: "fa-server", name: "服务" },
  { icon: "fa-database", name: "数据" },
  { icon: "fa-shield-halved", name: "安全" },
  { icon: "fa-graduation-cap", name: "教学" },
  { icon: "fa-trophy", name: "活动" },
  { icon: "fa-gift", name: "福利" },
  { icon: "fa-comments", name: "社区" },
  { icon: "fa-calendar-days", name: "日程" },
  { icon: "fa-book-open", name: "文档" },
  { icon: "fa-circle-question", name: "帮助" },
  { icon: "fa-robot", name: "AI 助手" },
  { icon: "fa-wave-square", name: "波动" },
  { icon: "fa-bolt", name: "电路" },
  { icon: "fa-magnifying-glass", name: "检索" },
  { icon: "fa-sliders", name: "参数" },
];

export function iconLabel(value: string): string | null {
  return ICON_OPTIONS.find((o) => o.icon === value)?.name ?? null;
}

/**
 * 图标选择器：从固定候选列表点选（存 FA 类名，如 fa-flask），
 * 「不显示」表示置空；候选列表写在前端，不占数据库表。
 */
export default function IconPicker({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (icon: string) => void;
  hint?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = iconLabel(value);

  return (
    <div className="field field--full" ref={rootRef}>
      <label>{label}</label>
      <div className="icon-picker">
        <button
          type="button"
          className={`icon-picker__trigger${open ? " is-open" : ""}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className={`icon-picker__preview${value ? "" : " is-none"}`}>
            <i className={`fa-solid ${value || "fa-ban"}`} aria-hidden />
          </span>
          <span className="icon-picker__label">
            {current ? `${current} · ${value}` : "不显示图标"}
          </span>
          <span className="icon-picker__caret">
            <i className="fa-solid fa-chevron-down" aria-hidden />
          </span>
        </button>
        {open ? (
          <div className="icon-picker__pop" role="listbox" aria-label={label}>
            <button
              type="button"
              className={`icon-picker__item icon-picker__item--none${value ? "" : " is-active"}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <span className="icon-picker__ico">
                <i className="fa-solid fa-ban" aria-hidden />
              </span>
              <span className="icon-picker__name">不显示</span>
            </button>
            {ICON_OPTIONS.map((opt) => (
              <button
                key={opt.icon}
                type="button"
                className={`icon-picker__item${value === opt.icon ? " is-active" : ""}`}
                title={opt.icon}
                onClick={() => {
                  onChange(opt.icon);
                  setOpen(false);
                }}
              >
                <span className="icon-picker__ico">
                  <i className={`fa-solid ${opt.icon}`} aria-hidden />
                </span>
                <span className="icon-picker__name">{opt.name}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <p className="field-hint">{hint ?? "用户端列表中展示的图标；不选则不显示"}</p>
    </div>
  );
}
