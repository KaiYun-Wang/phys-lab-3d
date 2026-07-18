"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteAdminFavorite,
  fetchAdminFavorites,
  fetchMe,
  type AdminFavorite,
  type AdminProfile,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function FavoritesPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<AdminFavorite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminFavorite | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminFavorites({ keyword: query || undefined });
      setItems(data.records ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [query]);

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
      await deleteAdminFavorite(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("收藏已删除");
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
    <AdminShell admin={admin} title="收藏管理">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">收藏管理</h2>
          <p className="caption">查看与删除用户收藏记录（共 {total} 条）</p>
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
              placeholder="搜索用户名/昵称/实验标题/路由…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-pill btn-pill--outline btn-pill--sm">
              搜索
            </button>
          </form>
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">★</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              暂无收藏
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户</th>
                  <th>实验</th>
                  <th>路由</th>
                  <th>收藏时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="data-table__num">{row.id}</td>
                    <td>
                      <span className="data-table__title">{row.nickname || row.username || row.userId}</span>
                      <div className="caption">
                        #{row.userId} {row.username}
                      </div>
                    </td>
                    <td>
                      {row.experimentId ? (
                        <Link href={`/experiments/${row.experimentId}/edit`} className="data-table__title">
                          {row.experimentTitle || row.experimentId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <code className="mono-tag">{row.experimentRoute || "—"}</code>
                    </td>
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
            <h3 className="heading-sm">确认删除收藏？</h3>
            <p className="caption">
              将删除用户「{deleteTarget.nickname || deleteTarget.username}」对「
              {deleteTarget.experimentTitle}」的收藏，并同步减少收藏数。
            </p>
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
