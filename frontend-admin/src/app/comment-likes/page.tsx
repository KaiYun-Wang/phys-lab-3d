"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteAdminCommentLike,
  fetchAdminCommentLikes,
  fetchMe,
  type AdminCommentLike,
  type AdminProfile,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function CommentLikesPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<AdminCommentLike[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [commentId, setCommentId] = useState("");
  const [userId, setUserId] = useState("");
  const [experimentId, setExperimentId] = useState("");
  const [filters, setFilters] = useState({ commentId: "", userId: "", experimentId: "" });
  const [deleteTarget, setDeleteTarget] = useState<AdminCommentLike | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminCommentLikes({
        commentId: filters.commentId || undefined,
        userId: filters.userId || undefined,
        experimentId: filters.experimentId || undefined,
      });
      setItems(data.records ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (admin) loadList();
  }, [admin, loadList]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminCommentLike(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("点赞已删除");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!admin) return <div className="auth-loading">加载中…</div>;

  return (
    <AdminShell admin={admin} title="评论点赞">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">评论点赞管理</h2>
          <p className="caption">查看与删除点赞记录（共 {total} 条）</p>
        </div>
      </section>

      <section className="card card--elevated">
        <div className="table-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
          <input
            className="text-input"
            style={{ width: 120 }}
            placeholder="评论 ID"
            value={commentId}
            onChange={(e) => setCommentId(e.target.value)}
          />
          <input
            className="text-input"
            style={{ width: 120 }}
            placeholder="用户 ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
          <input
            className="text-input"
            style={{ width: 120 }}
            placeholder="实验 ID"
            value={experimentId}
            onChange={(e) => setExperimentId(e.target.value)}
          />
          <button
            type="button"
            className="btn-pill btn-pill--outline btn-pill--sm"
            onClick={() =>
              setFilters({
                commentId: commentId.trim(),
                userId: userId.trim(),
                experimentId: experimentId.trim(),
              })
            }
          >
            筛选
          </button>
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">♥</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              暂无点赞
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>评论</th>
                  <th>实验</th>
                  <th>时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="data-table__num">{row.id}</td>
                    <td>
                      {row.nickname || row.username || row.userId}
                      <div className="caption">#{row.userId}</div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <span className="caption">#{row.commentId}</span>
                      <div className="data-table__title" title={row.commentContent ?? ""}>
                        {row.commentContent || "—"}
                      </div>
                    </td>
                    <td>{row.experimentTitle || row.experimentId || "—"}</td>
                    <td className="data-table__time">{formatDateTime(row.createTime)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-pill btn-pill--ghost btn-pill--sm row-actions__danger"
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
      </section>

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal card card--elevated" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-sm">确认删除点赞？</h3>
            <p className="caption">将删除该点赞记录，并同步减少评论点赞数。</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn-pill btn-pill--outline btn-pill--sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-pill btn-pill--danger btn-pill--sm"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
