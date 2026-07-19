"use client";

import Link from "next/link";
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

const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_CHUNK_OVERLAP = 128;

export default function KnowledgePage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<KbDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [chunkOverlap, setChunkOverlap] = useState(DEFAULT_CHUNK_OVERLAP);
  const [noChunk, setNoChunk] = useState(false);
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

  const resetUploadForm = () => {
    setTitle("");
    setFile(null);
    setChunkSize(DEFAULT_CHUNK_SIZE);
    setChunkOverlap(DEFAULT_CHUNK_OVERLAP);
    setNoChunk(false);
  };

  const closeUpload = () => {
    if (uploading) return;
    setShowUpload(false);
    resetUploadForm();
  };

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("请选择 .txt 或 .md 文件");
      return;
    }
    if (!noChunk && chunkOverlap >= chunkSize) {
      toast.error("重叠大小须小于块大小");
      return;
    }
    setUploading(true);
    try {
      await uploadKbDocument(file, {
        title,
        chunkSize: noChunk ? undefined : chunkSize,
        chunkOverlap: noChunk ? undefined : chunkOverlap,
        noChunk,
      });
      toast.success("上传并向量化成功");
      setShowUpload(false);
      resetUploadForm();
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
          <p className="page-caption">支持 UTF-8 的 .txt / .md 文件，上传时可配置分块参数。</p>
        </div>
        <button type="button" className="btn-pill btn-pill--primary" onClick={() => setShowUpload(true)}>
          上传文档
        </button>
      </div>

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
                      <div className="table-actions">
                        <Link
                          href={`/knowledge/${row.id}`}
                          className="btn-pill btn-pill--ghost btn-pill--sm"
                        >
                          分块
                        </Link>
                        <button
                          type="button"
                          className="btn-pill btn-pill--ghost btn-pill--sm"
                          onClick={() => setDeleteTarget(row)}
                        >
                          删除
                        </button>
                      </div>
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

      {showUpload && (
        <div className="modal-overlay" role="presentation" onClick={closeUpload}>
          <div
            className="modal modal--kb-upload card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kb-upload-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="kb-modal-head">
              <div>
                <h3 className="heading-sm" id="kb-upload-title">
                  上传文档
                </h3>
                <p className="page-caption">选择本地文件并配置分块策略</p>
              </div>
              <button type="button" className="btn-pill btn-pill--ghost btn-pill--sm" onClick={closeUpload}>
                关闭
              </button>
            </div>

            <form className="kb-upload-modal-form" onSubmit={onUpload}>
              <label className="field">
                <span className="field-label">文档标题（可选）</span>
                <input
                  className="text-input"
                  placeholder="默认使用文件名"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">本地文件</span>
                <div className="kb-upload-file-row">
                  <label className="btn-pill btn-pill--outline kb-upload-pick">
                    选择文件
                    <input
                      type="file"
                      className="kb-upload-pick__input"
                      accept=".txt,.md,.markdown,text/plain,text/markdown"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <span className="kb-upload-filename">{file ? file.name : "未选择任何文件"}</span>
                </div>
              </label>

              <div className="kb-chunk-box">
                <label className="field">
                  <span className="field-label">分块策略</span>
                  <select className="text-input" value="fixed_size" disabled>
                    <option value="fixed_size">fixed_size</option>
                  </select>
                </label>

                <div className="kb-chunk-params">
                  <label className="field">
                    <span className="field-label">块大小</span>
                    <input
                      className="text-input"
                      type="number"
                      min={1}
                      max={100000}
                      value={chunkSize}
                      disabled={noChunk}
                      onChange={(e) => setChunkSize(Number(e.target.value) || 1)}
                    />
                  </label>
                  <button
                    type="button"
                    className={`btn-pill btn-pill--sm ${noChunk ? "btn-pill--primary" : "btn-pill--outline"}`}
                    onClick={() => setNoChunk((v) => !v)}
                  >
                    {noChunk ? "已不分块" : "不分块"}
                  </button>
                  <label className="field">
                    <span className="field-label">重叠大小</span>
                    <input
                      className="text-input"
                      type="number"
                      min={0}
                      max={99999}
                      value={chunkOverlap}
                      disabled={noChunk}
                      onChange={(e) => setChunkOverlap(Number(e.target.value) || 0)}
                    />
                  </label>
                </div>
                <p className="field-hint">
                  按字符数切分；选择「不分块」时整篇作为一块写入。
                </p>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-pill btn-pill--ghost" onClick={closeUpload} disabled={uploading}>
                  取消
                </button>
                <button type="submit" className="btn-pill btn-pill--primary" disabled={uploading}>
                  {uploading ? "上传中…" : "上传"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
