"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/AdminShell";
import PageCrumb from "@/components/PageCrumb";
import { useAdmin } from "@/components/AdminProvider";
import KnowledgeMarkdownEditor from "@/components/KnowledgeMarkdownEditor";
import { useToast } from "@/components/Toast";
import {
  fetchKnowledgePage,
  updateKnowledgePage,
  type KnowledgePageInput,
} from "@/lib/api";

export default function KnowledgeEditPage() {
  const params = useParams();
  const id = Number(params.id);
  const router = useRouter();
  const toast = useToast();
  const admin = useAdmin();
  const [form, setForm] = useState<KnowledgePageInput | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id)) return;
    setLoading(true);
    fetchKnowledgePage(id)
      .then((page) => {
        setForm({
          title: page.title,
          description: page.description ?? "",
          content: page.content ?? "",
        });
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "加载失败");
        router.replace("/knowledge");
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  function onFile(file: File) {
    const lower = file.name.toLowerCase();
    if (!(lower.endsWith(".md") || lower.endsWith(".markdown") || lower.endsWith(".txt"))) {
      toast.error("仅支持 .md / .txt");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFileName(file.name);
      setForm((f) => (f ? { ...f, content: String(reader.result ?? "") } : f));
      toast.success("已用文件替换正文");
    };
    reader.onerror = () => toast.error("读取文件失败");
    reader.readAsText(file, "UTF-8");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      await updateKnowledgePage(id, {
        title: form.title.trim(),
        description: form.description?.trim() || "",
        content: form.content.trim(),
      });
      toast.success("已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <PageCrumb parent="知识库" parentHref="/knowledge">
            <h2 className="page-title">
              编辑知识库
            </h2>
          </PageCrumb>
        </div>
      </section>

      <section className="card card--elevated">
        {loading || !form ? (
          <p className="caption">加载中…</p>
        ) : (
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
                  onChange={(e) => setForm((f) => (f ? { ...f, title: e.target.value } : f))}
                />
              </div>
              <div className="field field--full">
                <label htmlFor="kp-desc">描述</label>
                <input
                  id="kp-desc"
                  className="text-input"
                  value={form.description ?? ""}
                  maxLength={500}
                  placeholder="给 AI 选型用的短摘要"
                  onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                />
              </div>
              <div className="field field--full">
                <label>正文</label>
                <KnowledgeMarkdownEditor
                  value={form.content}
                  required
                  fileName={fileName}
                  onChange={(content) => setForm((f) => (f ? { ...f, content } : f))}
                  onFile={onFile}
                />
              </div>
            </div>
            <div className="modal-actions mt-16">
              <Link href="/knowledge" className="btn-pill btn-pill--ghost">
                返回
              </Link>
              <button type="submit" className="btn-pill btn-pill--primary" disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </form>
        )}
      </section>
    </AdminShell>
  );
}
