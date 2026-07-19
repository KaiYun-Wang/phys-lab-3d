"use client";

import { FormEvent, useState } from "react";
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
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({ title: title.trim(), content: content.trim() });
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

        <div className="field field--full">
          <label htmlFor="content">正文</label>
          <textarea
            className="text-input text-input--textarea"
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            placeholder="公告内容"
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
