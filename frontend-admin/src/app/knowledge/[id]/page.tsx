"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteKbChunk,
  fetchKbChunks,
  fetchKbDocuments,
  fetchMe,
  updateKbChunk,
  type AdminProfile,
  type KbChunk,
  type KbDocument,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function KnowledgeChunksPage() {
  const toast = useToast();
  const params = useParams();
  const documentId = Number(params.id);

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [doc, setDoc] = useState<KbDocument | null>(null);
  const [chunks, setChunks] = useState<KbChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editTarget, setEditTarget] = useState<KbChunk | null>(null);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<KbChunk | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMe()
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  const load = useCallback(async () => {
    if (!Number.isFinite(documentId) || documentId <= 0) {
      setError("无效的文档 ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [page, list] = await Promise.all([
        fetchKbDocuments(1, 100),
        fetchKbChunks(documentId),
      ]);
      const found = (page.records ?? []).find((d) => d.id === documentId) ?? null;
      setDoc(found);
      setChunks(list);
      if (!found) setError("文档不存在或已删除");
    } catch (e) {
      setChunks([]);
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (admin) load();
  }, [admin, load]);

  const openEdit = (chunk: KbChunk) => {
    setEditTarget(chunk);
    setEditContent(chunk.content);
  };

  const onSave = async () => {
    if (!editTarget) return;
    const trimmed = editContent.trim();
    if (!trimmed) {
      toast.error("分块内容不能为空");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateKbChunk(editTarget.id, trimmed);
      setChunks((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success("已保存并重新向量化");
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKbChunk(deleteTarget.id);
      toast.success("已删除分块");
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
    <AdminShell admin={admin} title="知识库分块">
      <div className="page-toolbar">
        <div>
          <p className="page-caption">
            <Link href="/knowledge" className="kb-back-link">
              ← 返回知识库
            </Link>
          </p>
          <h2 className="page-title">Chunk 列表</h2>
          <p className="page-caption">
            {doc ? `${doc.title} · ${doc.filename}` : `文档 #${documentId}`}
            {" · "}
            可编辑正文；保存后会重新生成向量。
          </p>
        </div>
        <button type="button" className="btn-pill btn-pill--outline" onClick={() => load()} disabled={loading}>
          刷新
        </button>
      </div>

      <section className="card card--elevated">
        {error && <p className="form-error">{error}</p>}
        {loading ? (
          <p className="empty-block">加载中…</p>
        ) : chunks.length === 0 ? (
          <p className="empty-block">暂无分块</p>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 72 }}>序号</th>
                  <th>内容</th>
                  <th style={{ width: 88 }}>字符数</th>
                  <th style={{ width: 160 }}>创建时间</th>
                  <th style={{ width: 140 }} />
                </tr>
              </thead>
              <tbody>
                {chunks.map((row) => (
                  <tr key={row.id}>
                    <td>{row.chunkIndex}</td>
                    <td>
                      <div className="kb-chunk-preview" title={row.content}>
                        {row.content}
                      </div>
                    </td>
                    <td>{row.charCount}</td>
                    <td>{formatDateTime(row.createTime)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-pill btn-pill--ghost btn-pill--sm"
                          onClick={() => openEdit(row)}
                        >
                          编辑
                        </button>
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
          共 {chunks.length} 块
        </p>
      </section>

      {editTarget && (
        <div className="modal-overlay" role="presentation" onClick={() => !saving && setEditTarget(null)}>
          <div
            className="modal modal--kb-edit card card--elevated"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm">编辑分块 #{editTarget.chunkIndex}</h3>
            <textarea
              className="text-input text-input--textarea kb-chunk-editor"
              rows={14}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
            />
            <p className="field-hint">保存后将重新调用嵌入模型更新向量。</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-pill btn-pill--ghost"
                disabled={saving}
                onClick={() => setEditTarget(null)}
              >
                取消
              </button>
              <button type="button" className="btn-pill btn-pill--primary" disabled={saving} onClick={onSave}>
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal card card--elevated" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-sm">删除分块？</h3>
            <p className="page-caption">将删除序号 {deleteTarget.chunkIndex} 的切片及其向量。</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-pill btn-pill--ghost"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
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
