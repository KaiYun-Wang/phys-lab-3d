"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteKbDocument,
  fetchKbDocuments,
  fetchMe,
  uploadKbDocument,
  type AdminProfile,
  type KbDocument,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function KnowledgePage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<KbDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KbDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const page = await fetchKbDocuments(1, 50);
      setItems(page.records ?? []);
      setTotal(page.total ?? 0);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("请选择 .txt 或 .md 文件");
      return;
    }
    setUploading(true);
    try {
      await uploadKbDocument(file, title);
      toast.success("上传并向量化成功");
      setTitle("");
      setFile(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKbDocument(deleteTarget.id);
      toast.success("已删除");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  };

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="知识库">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">知识库文档</h2>
          <p className="page-caption">支持 UTF-8 的 .txt / .md 文件。</p>
        </div>
      </div>

      <section className="card card--elevated" style={{ marginBottom: 16 }}>
        <form className="kb-upload-form" onSubmit={onUpload}>
          <input
            className="text-input"
            placeholder="文档标题（可选）"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label className="btn-pill btn-pill--outline kb-upload-pick">
            选择文件
            <input
              type="file"
              className="kb-upload-pick__input"
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <span className="kb-upload-filename">{file ? file.name : "未选择文件"}</span>
          <button type="submit" className="btn-pill btn-pill--primary" disabled={uploading}>
            {uploading ? "上传中…" : "上传"}
          </button>
        </form>
      </section>

      <section className="card card--elevated">
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p className="empty-block">加载中…</p>
        ) : items.length === 0 ? (
          <p className="empty-block">暂无文档。上传后即可在 AI 试聊 / 用户端助手中检索。</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>文件名</th>
                  <th>状态</th>
                  <th>切片数</th>
                  <th>更新时间</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.filename}</td>
                    <td>
                      <span className="pill-tag">{row.status}</span>
                    </td>
                    <td>{row.chunkCount}</td>
                    <td>{formatDateTime(row.updateTime)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-pill btn-pill--ghost btn-pill--sm"
                        onClick={() => setDeleteTarget(row)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="page-caption" style={{ marginTop: 12 }}>
          共 {total} 篇
        </p>
      </section>

      {deleteTarget && (
        <div className="modal-overlay" role="dialog">
          <div className="modal card card--elevated">
            <h3>删除文档</h3>
            <p>确定删除「{deleteTarget.title}」及其全部向量切片？</p>
            <div className="modal-actions">
              <button type="button" className="btn-pill btn-pill--ghost" onClick={() => setDeleteTarget(null)}>
                取消
              </button>
              <button type="button" className="btn-pill" disabled={deleting} onClick={onDelete}>
                {deleting ? "删除中…" : "删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
