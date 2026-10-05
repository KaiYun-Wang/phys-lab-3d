"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type RowDetailField = { label: string; value: ReactNode };

/**
 * 行操作栏「查看」按钮（置于操作按钮组最左）：点击弹出整行只读详情弹窗。
 * 弹窗通过 createPortal 挂 body：规避表格行 hover transform 对 fixed 定位的干扰。
 */
export default function RowDetailButton({
  title,
  fields,
}: {
  title: string;
  fields: RowDetailField[];
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn-pill btn-pill--ghost btn-pill--sm"
        onClick={() => setOpen(true)}
      >
        查看
      </button>
      {open
        ? createPortal(
            <div className="modal-overlay" role="presentation" onClick={() => setOpen(false)}>
              <div
                className="modal card card--elevated mw-520"
                role="dialog"
                aria-modal="true"
                aria-label={title}
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="heading-sm">{title}</h3>
                <div className="detail-grid">
                  {fields.map((f) => (
                    <div className="detail-grid__row" key={f.label}>
                      <span className="detail-grid__label">{f.label}</span>
                      <span className="detail-grid__value">{f.value}</span>
                    </div>
                  ))}
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-pill btn-pill--outline btn-pill--sm"
                    onClick={() => setOpen(false)}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
