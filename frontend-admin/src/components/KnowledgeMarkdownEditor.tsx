"use client";

import { useId, useState } from "react";
import ReactMarkdown from "react-markdown";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFile?: (file: File) => void;
  fileName?: string | null;
  rows?: number;
  required?: boolean;
};

export default function KnowledgeMarkdownEditor({
  value,
  onChange,
  onFile,
  fileName,
  rows = 20,
  required,
}: Props) {
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const fileId = useId();

  return (
    <div className="kp-md">
      <div className="kp-md__toolbar">
        <div className="kp-md__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "edit"}
            className={`btn-pill btn-pill--sm ${mode === "edit" ? "btn-pill--primary" : "btn-pill--ghost"}`}
            onClick={() => setMode("edit")}
          >
            编辑
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "preview"}
            className={`btn-pill btn-pill--sm ${mode === "preview" ? "btn-pill--primary" : "btn-pill--ghost"}`}
            onClick={() => setMode("preview")}
          >
            预览
          </button>
        </div>
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

      {mode === "edit" ? (
        <textarea
          className="text-input text-input--textarea kp-md__editor"
          rows={rows}
          required={required}
          value={value}
          placeholder="Markdown / 纯文本"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <div className="kp-md__preview">
          {value.trim() ? (
            <ReactMarkdown>{value}</ReactMarkdown>
          ) : (
            <p className="caption">暂无内容</p>
          )}
        </div>
      )}
    </div>
  );
}
