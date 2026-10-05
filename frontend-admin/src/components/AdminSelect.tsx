"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = { value: string; label: string };

/**
 * 自定义下拉框：替代原生 select（原生暗色皮在深色玻璃体系里太尖锐）。
 * 弹层与图标选择器同材质；支持点击外部 / Esc 关闭、方向键 + 回车选择。
 */
export default function AdminSelect({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = options.find((o) => o.value === value);

  function openMenu() {
    const idx = options.findIndex((o) => o.value === value);
    setActive(idx < 0 ? 0 : idx);
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[active];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className={`admin-select${open ? " is-open" : ""}${className ? ` ${className}` : ""}`}
    >
      <button
        type="button"
        className="admin-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={`admin-select__value${current ? "" : " is-placeholder"}`}>
          {current?.label ?? "—"}
        </span>
        <span className="admin-select__caret">
          <i className="fa-solid fa-chevron-down" aria-hidden />
        </span>
      </button>
      {open ? (
        <div className="admin-select__pop" role="listbox" aria-label={ariaLabel}>
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              className={`admin-select__opt${opt.value === value ? " is-active" : ""}${
                i === active ? " is-focused" : ""
              }`}
              onMouseEnter={() => setActive(i)}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span>{opt.label}</span>
              <i className="fa-solid fa-check admin-select__check" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
