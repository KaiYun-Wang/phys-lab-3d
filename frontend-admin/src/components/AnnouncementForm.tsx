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
  const [description, setDescription] = useState(initial.description ?? "");
  const [icon, setIcon] = useState(initial.icon ?? "");
  const [content, setContent] = useState(initial.content);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; content?: string }>({});

  function validateField(field: "title" | "content", values: Record<string, string>): string | undefined {
    if (field === "title") return values.title ? undefined : "请输入标题";
    return values.content ? undefined : "请输入正文";
  }

  function clearFieldError(field: "title" | "content") {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleBlur(field: "title" | "content") {
    const msg = validateField(field, { title: title.trim(), content: content.trim() });
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  }

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
    const values = { title: title.trim(), content: content.trim() };
    const nextErrors = {
      title: validateField("title", values),
      content: validateField("content", values),
    };
    if (nextErrors.title || nextErrors.content) {
      setFieldErrors(nextErrors);
      return;
    }
    onSubmit({
      title: values.title,
      description: description.trim() || undefined,
      icon: icon.trim() || undefined,
      content: values.content,
    });
  }

  return (
    <form className="experiment-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="field field--full">
          <label htmlFor="title">标题</label>
          <input
            className={`text-input${fieldErrors.title ? " is-invalid" : ""}`}
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearFieldError("title");
            }}
            onBlur={() => handleBlur("title")}
            maxLength={100}
            placeholder="公告标题"
            aria-invalid={!!fieldErrors.title}
            required
          />
          {fieldErrors.title ? (
            <p className="auth-field-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden />
              {fieldErrors.title}
            </p>
          ) : null}
        </div>

        <div className="field field--full">
          <label htmlFor="description">描述（列表展示）</label>
          <input
            className="text-input"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            placeholder="一句话摘要：管理端列表与用户端公告卡展示，详情不展示（可选）"
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
            onChange={(v) => {
              setContent(v);
              clearFieldError("content");
            }}
            onFile={onFile}
            fileName={fileName}
            rows={14}
            required
            invalid={!!fieldErrors.content}
          />
          {fieldErrors.content ? (
            <p className="auth-field-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden />
              {fieldErrors.content}
            </p>
          ) : null}
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
