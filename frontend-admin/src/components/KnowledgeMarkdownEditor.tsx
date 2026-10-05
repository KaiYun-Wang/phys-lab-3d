"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFile?: (file: File) => void;
  fileName?: string | null;
  rows?: number;
  required?: boolean;
};

function scrollRatio(el: HTMLElement) {
  const max = el.scrollHeight - el.clientHeight;
  return max > 0 ? el.scrollTop / max : 0;
}

function applyScrollRatio(el: HTMLElement, ratio: number) {
  const max = el.scrollHeight - el.clientHeight;
  el.scrollTop = max > 0 ? ratio * max : 0;
}

export default function KnowledgeMarkdownEditor({
  value,
  onChange,
  onFile,
  fileName,
  rows = 20,
  required,
}: Props) {
  const fileId = useId();
  const [showPreview, setShowPreview] = useState(true);
  const [editPct, setEditPct] = useState(50);
  const editRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);
  const dragRef = useRef<{ startX: number; startPct: number; width: number } | null>(null);

  const syncScroll = useCallback((from: "edit" | "preview") => {
    if (syncing.current || !showPreview) return;
    const src = from === "edit" ? editRef.current : previewRef.current;
    const dst = from === "edit" ? previewRef.current : editRef.current;
    if (!src || !dst) return;
    syncing.current = true;
    applyScrollRatio(dst, scrollRatio(src));
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  }, [showPreview]);

  function onGutterPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault();
    const split = e.currentTarget.parentElement;
    if (!split) return;
    dragRef.current = {
      startX: e.clientX,
      startPct: editPct,
      width: split.getBoundingClientRect().width,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onGutterPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.width <= 0) return;
    const next = drag.startPct + ((e.clientX - drag.startX) / drag.width) * 100;
    setEditPct(Math.min(80, Math.max(20, next)));
  }

  function onGutterPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  const splitStyle = showPreview
    ? ({ ["--edit-pct"]: `${editPct}%` } as CSSProperties)
    : undefined;

  return (
    <div className="kp-md">
      <div className="kp-md__toolbar">
        <button
          type="button"
          className={`btn-pill btn-pill--sm ${showPreview ? "btn-pill--primary" : "btn-pill--ghost"}`}
          onClick={() => setShowPreview((v) => !v)}
        >
          {showPreview ? "关闭预览" : "显示预览"}
        </button>
        {onFile ? (
          <div className="kb-upload-file-row">
            <label htmlFor={fileId} className="btn-pill btn-pill--outline btn-pill--sm kb-upload-pick">
              上传 .md / .txt
              <input
                id={fileId}
                type="file"
                className="kb-upload-pick__input"
                accept=".md,.markdown,.txt,text/plain,text/markdown"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </label>
            <span className="kb-upload-filename">{fileName || "未选择文件"}</span>
          </div>
        ) : null}
      </div>

      <div className={`kp-md__split${showPreview ? "" : " kp-md__split--solo"}`} style={splitStyle}>
        <textarea
          ref={editRef}
          className="text-input text-input--textarea kp-md__editor"
          rows={rows}
          required={required}
          value={value}
          placeholder="Markdown / 纯文本"
          onChange={(e) => onChange(e.target.value)}
          onScroll={() => syncScroll("edit")}
        />
        {showPreview ? (
          <>
            <div
              className="kp-md__gutter"
              role="separator"
              aria-orientation="vertical"
              aria-valuenow={Math.round(editPct)}
              aria-label="拖动调整编辑与预览宽度"
              onPointerDown={onGutterPointerDown}
              onPointerMove={onGutterPointerMove}
              onPointerUp={onGutterPointerUp}
              onPointerCancel={onGutterPointerUp}
            />
            <div
              ref={previewRef}
              className="kp-md__preview"
              onScroll={() => syncScroll("preview")}
            >
              {value.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
              ) : (
                <p className="caption">暂无内容</p>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
