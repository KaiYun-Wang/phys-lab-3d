"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type DateRangeValue = {
  from: string;
  to: string;
};

type Props = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
};

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseKey(key: string) {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDate(key: string) {
  const d = parseKey(key);
  if (!d) return "";
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

function addYears(d: Date, n: number) {
  return new Date(d.getFullYear() + n, d.getMonth(), 1);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Monday-first weekday index 0–6 */
function mondayIndex(d: Date) {
  return (d.getDay() + 6) % 7;
}

function todayKey() {
  return toKey(new Date());
}

function daysAgoKey(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toKey(d);
}

export default function DateRangePicker({ value, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(parseKey(value.from) ?? new Date()));
  const [draftFrom, setDraftFrom] = useState(value.from);
  const [draftTo, setDraftTo] = useState(value.to);

  useEffect(() => {
    if (!open) return;
    setDraftFrom(value.from);
    setDraftTo(value.to);
    setMonth(startOfMonth(parseKey(value.from) ?? parseKey(value.to) ?? new Date()));
  }, [open, value.from, value.to]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = startOfMonth(month);
    const lead = mondayIndex(first);
    const total = daysInMonth(month);
    const list: Array<{ key: string; day: number; inMonth: boolean } | null> = [];
    for (let i = 0; i < lead; i++) list.push(null);
    for (let day = 1; day <= total; day++) {
      const d = new Date(month.getFullYear(), month.getMonth(), day);
      list.push({ key: toKey(d), day, inMonth: true });
    }
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [month]);

  function pick(key: string) {
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(key);
      setDraftTo("");
      return;
    }
    if (key < draftFrom) {
      setDraftFrom(key);
      setDraftTo(draftFrom);
      return;
    }
    setDraftTo(key);
  }

  function applyRange(from: string, to: string) {
    onChange({ from, to });
    setOpen(false);
  }

  function clear() {
    onChange({ from: "", to: "" });
    setDraftFrom("");
    setDraftTo("");
    setOpen(false);
  }

  const hasValue = Boolean(value.from || value.to);
  const canApply = Boolean(draftFrom && draftTo);

  return (
    <div className="date-range" ref={rootRef}>
      <button
        type="button"
        className={`date-range__trigger${hasValue ? " is-active" : ""}${open ? " is-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="选择时间范围"
      >
        <span className="date-range__icon" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.4" />
            <path d="M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className={`date-range__slot${value.from ? " is-filled" : ""}`}>
          {value.from ? formatDate(value.from) : "开始日期"}
        </span>
        <span className="date-range__dash" aria-hidden>
          -
        </span>
        <span className={`date-range__slot${value.to ? " is-filled" : ""}`}>
          {value.to ? formatDate(value.to) : "结束日期"}
        </span>
        {hasValue ? (
          <span
            className="date-range__clear"
            role="button"
            tabIndex={-1}
            aria-label="清除时间范围"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              clear();
            }}
          >
            ×
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="date-range__panel" role="dialog" aria-label="选择时间范围">
          <div className="date-range__presets">
            <button type="button" className="date-range__preset" onClick={() => applyRange(todayKey(), todayKey())}>
              今天
            </button>
            <button type="button" className="date-range__preset" onClick={() => applyRange(daysAgoKey(6), todayKey())}>
              近 7 天
            </button>
            <button type="button" className="date-range__preset" onClick={() => applyRange(daysAgoKey(29), todayKey())}>
              近 30 天
            </button>
          </div>

          <div className="date-range__nav">
            <div className="date-range__nav-group">
              <button type="button" className="date-range__nav-btn" onClick={() => setMonth((m) => addYears(m, -1))} aria-label="上一年">
                «
              </button>
              <button type="button" className="date-range__nav-btn" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="上一月">
                ‹
              </button>
            </div>
            <span className="date-range__month">
              {month.getFullYear()}年{month.getMonth() + 1}月
            </span>
            <div className="date-range__nav-group">
              <button type="button" className="date-range__nav-btn" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="下一月">
                ›
              </button>
              <button type="button" className="date-range__nav-btn" onClick={() => setMonth((m) => addYears(m, 1))} aria-label="下一年">
                »
              </button>
            </div>
          </div>

          <div className="date-range__weekdays">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          <div className="date-range__grid">
            {cells.map((cell, i) => {
              if (!cell) return <span key={`e-${i}`} className="date-range__day is-empty" />;
              const start = draftFrom;
              const end = draftTo || draftFrom;
              const isStart = cell.key === start;
              const isEnd = Boolean(draftTo) && cell.key === draftTo;
              const inRange =
                Boolean(start && end) && cell.key >= start && cell.key <= end && start !== end;
              return (
                <button
                  key={cell.key}
                  type="button"
                  className={[
                    "date-range__day",
                    isStart || isEnd ? "is-edge" : "",
                    inRange ? "is-in-range" : "",
                    cell.key === todayKey() ? "is-today" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => pick(cell.key)}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          <div className="date-range__footer">
            <span className="date-range__hint">
              {draftFrom && draftTo
                ? `${formatDate(draftFrom)} – ${formatDate(draftTo)}`
                : draftFrom
                  ? "再选结束日期"
                  : "先选开始日期"}
            </span>
            <div className="date-range__actions">
              <button
                type="button"
                className="btn-pill btn-pill--primary btn-pill--sm"
                disabled={!canApply}
                onClick={() => canApply && applyRange(draftFrom, draftTo)}
              >
                应用
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
