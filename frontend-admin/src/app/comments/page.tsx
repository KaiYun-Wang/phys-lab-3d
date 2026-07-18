"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteAdminComment,
  fetchAdminComments,
  fetchMe,
  updateAdminCommentStatus,
  type AdminComment,
  type AdminProfile,
} from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "VISIBLE" | "HIDDEN" | "DELETED";

export default function CommentsPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminComments({
        keyword: query || undefined,
        status: statusFilter,
      });
      setItems(data.records ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (admin) loadList();
  }, [admin, loadList]);

  async function toggleStatus(row: AdminComment) {
    const next = row.status === "VISIBLE" ? "HIDDEN" : "VISIBLE";
    try {
      await updateAdminCommentStatus(row.id, next);
      toast.success(next === "HIDDEN" ? "已隐藏" : "已恢复可见");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminComment(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("评论已删除");
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
    <AdminShell admin={admin} title="评论管理">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">评论管理</h2>
          <p className="caption">审核评论内容（共 {total} 条）</p>
        </div>
      </section>

      <section className="card card--elevated">
        <div className="table-toolbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
          >
            <input
              className="text-input search-form__input"
              type="search"
              placeholder="搜索评论内容…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-pill btn-pill--outline btn-pill--sm">
              搜索
            </button>
          </form>
          <select
            className="text-input table-toolbar__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="状态筛选"
          >
            <option value="all">全部状态</option>
            <option value="VISIBLE">可见</option>
            <option value="HIDDEN">已隐藏</option>
            <option value="DELETED">已删除</option>
          </select>
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">💬</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              暂无评论
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>内容</th>
                  <th>作者</th>
                  <th>实验</th>
                  <th>楼/回复</th>
                  <th>赞</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="data-table__num">{row.id}</td>
                    <td style={{ maxWidth: 280 }}>
                      <span className="data-table__title" title={row.content}>
                        {row.content.length > 60 ? `${row.content.slice(0, 60)}…` : row.content}
                      </span>
                    </td>
                    <td>
                      {row.nickname || row.username || row.userId}
                      <div className="caption">#{row.userId}</div>
                    </td>
                    <td>
                      {row.experimentId ? (
                        <Link href={`/experiments/${row.experimentId}/edit`}>
                          {row.experimentTitle || row.experimentId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="data-table__num">
                      {row.rootId == null ? "一级" : `楼#${row.rootId} → #${row.replyToId}`}
                    </td>
                    <td className="data-table__num">{formatCount(row.likeCount)}</td>
                    <td>
                      <span
                        className={`pill-tag ${
                          row.status === "VISIBLE"
                            ? "pill-tag--mint"
                            : row.status === "HIDDEN"
                              ? "pill-tag--shade"
                              : "pill-tag--shade"
                        }`}
                      >
                        {row.status === "VISIBLE" ? "可见" : row.status === "HIDDEN" ? "隐藏" : "已删"}
                      </span>
                    </td>
                    <td className="data-table__time">{formatDateTime(row.createTime)}</td>
                    <td>
                      <div className="row-actions">
                        {row.status !== "DELETED" && (
                          <button
                            type="button"
                            className="btn-pill btn-pill--ghost btn-pill--sm"
                            onClick={() => toggleStatus(row)}
                          >
                            {row.status === "VISIBLE" ? "隐藏" : "恢复"}
                          </button>
                        )}
                        {row.status !== "DELETED" && (
                          <button
                            type="button"
                            className="btn-pill btn-pill--ghost btn-pill--sm row-actions__danger"
                            onClick={() => setDeleteTarget(row)}
                          >
                            删除
                          </button>
                        )}
                      </div>
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
            <h3 className="heading-sm">确认删除评论？</h3>
            <p className="caption">将标记为已删除，并从用户端隐藏；若为一级评论，其子回复一并处理。</p>
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
