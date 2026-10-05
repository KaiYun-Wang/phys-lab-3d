"use client";

import { FormEvent, useState } from "react";
import KnowledgeMarkdownEditor from "@/components/KnowledgeMarkdownEditor";
import IconPicker from "@/components/IconPicker";
import { useToast } from "@/components/Toast";
import type { AnnouncementInput } from "@/lib/api";

export type AnnouncementFormValues = AnnouncementInput;

type AnnouncementFormProps = {
  initial: AnnouncementFormValues;
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: (values: AnnouncementFormValues) => void;
  onCancel: () => void;
};

export default function AnnouncementForm({
  initial,
  mode,
  submitting,
  onSubmit,
  onCancel,
}: AnnouncementFormProps) {
  const toast = useToast();
  const [title, setTitle] = useState(initial.title);
  const [icon, setIcon] = useState(initial.icon ?? "");
  const [content, setContent] = useState(initial.content);
  const [fileName, setFileName] = useState<string | null>(null);

  function onFile(file: File) {
    const lower = file.name.toLowerCase();
    if (!(lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt"))) {
      toast.error("仅支持 .md / .txt");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setFileName(file.name);
      setContent(text);
      setTitle((t) => t.trim() || file.name.replace(/\.(md|markdown|txt)$/i, ""));
      toast.success("已读入文件");
    };
    reader.onerror = () => toast.error("读取文件失败");
    reader.readAsText(file, "UTF-8");
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ title: title.trim(), icon: icon.trim() || undefined, content: content.trim() });
  }

  return (
    <form className="experiment-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field field--full">
          <label htmlFor="title">标题</label>
          <input
            className="text-input"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="公告标题"
            required
          />
        </div>

        <IconPicker
          label="列表图标（可选）"
          value={icon}
          onChange={setIcon}
          hint="用户端公告列表中展示的图标；不选则不显示"
        />

        <div className="field field--full">
          <label>正文（Markdown）</label>
          <KnowledgeMarkdownEditor
            value={content}
            onChange={setContent}
            onFile={onFile}
            fileName={fileName}
            rows={14}
            required
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-pill btn-pill--outline btn-pill--sm" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button type="submit" className="btn-pill btn-pill--primary btn-pill--sm" disabled={submitting}>
          {submitting ? "保存中…" : mode === "create" ? "发布公告" : "保存更改"}
        </button>
      </div>
    </form>
  );
}
