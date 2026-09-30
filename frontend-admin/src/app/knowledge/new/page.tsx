"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import KnowledgeMarkdownEditor from "@/components/KnowledgeMarkdownEditor";
import { useToast } from "@/components/Toast";
import {
  createKnowledgePage,
  fetchMe,
  type AdminProfile,
  type KnowledgePageInput,
} from "@/lib/api";

const EMPTY: KnowledgePageInput = { title: "", description: "", content: "" };

export default function KnowledgeNewPage() {
  const router = useRouter();
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [form, setForm] = useState<KnowledgePageInput>(EMPTY);
  const [fileName, setFileName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

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
      setForm((f) => ({
        ...f,
        content: text,
        title: f.title.trim() || file.name.replace(/\.(md|markdown|txt)$/i, ""),
      }));
      toast.success("已读入文件");
    };
    reader.onerror = () => toast.error("读取文件失败");
    reader.readAsText(file, "UTF-8");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await createKnowledgePage({
        title: form.title.trim(),
        description: form.description?.trim() || "",
        content: form.content.trim(),
      });
      toast.success("已创建");
      router.replace(`/knowledge/${created.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (!admin) return <div className="auth-loading">加载中…</div>;

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <Link href="/knowledge" className="caption">
            ← 返回列表
          </Link>
          <h2 className="page-title" style={{ marginTop: 8 }}>
            新增知识页
          </h2>
        </div>
      </section>

      <section className="card card--elevated">
        <form className="experiment-form" onSubmit={handleSave}>
          <div className="form-grid">
            <div className="field field--full">
              <label htmlFor="kp-title">文档名</label>
              <input
                id="kp-title"
                className="text-input"
                value={form.title}
                maxLength={200}
                required
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="field field--full">
              <label htmlFor="kp-desc">描述</label>
              <input
                id="kp-desc"
                className="text-input"
                value={form.description ?? ""}
                maxLength={500}
                placeholder="给 AI 选型用的短摘要，例如：文丘里管流速与压强"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="field field--full">
              <label>正文</label>
              <KnowledgeMarkdownEditor
                value={form.content}
                required
                fileName={fileName}
                onChange={(content) => setForm((f) => ({ ...f, content }))}
                onFile={onFile}
              />
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <Link href="/knowledge" className="btn-pill btn-pill--ghost">
              取消
            </Link>
            <button type="submit" className="btn-pill btn-pill--primary" disabled={saving}>
              {saving ? "保存中…" : "创建"}
            </button>
          </div>
        </form>
      </section>
    </AdminShell>
  );
}
