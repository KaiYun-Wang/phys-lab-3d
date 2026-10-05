"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAdmin } from "@/components/AdminProvider";
import DateRangePicker, { type DateRangeValue } from "@/components/DateRangePicker";
import {
  deleteAdminFavorite,
  fetchAdminFavorites,
  type AdminFavorite,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import Pager from "@/components/Pager";
import { useToast } from "@/components/Toast";

const PAGE_SIZE = 20;

export default function FavoritesPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [items, setItems] = useState<AdminFavorite[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [filters, setFilters] = useState({ keyword: "", from: "", to: "" });
  const [deleteTarget, setDeleteTarget] = useState<AdminFavorite | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminFavorites({
        keyword: filters.keyword || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        size: PAGE_SIZE,
      });
      const rows = data.records ?? [];
      if (rows.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
        return;
      }
      setItems(rows);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

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

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">收藏管理</h2>
        </div>
      </section>

      <section className="card card--elevated">
        <div className="table-toolbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setFilters({
                keyword: search.trim(),
                from: range.from,
                to: range.to,
              });
            }}
          >
            <input
              className="text-input search-form__input"
              type="search"
              placeholder="用户 / 实验"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <DateRangePicker
              value={range}
              onChange={(next) => {
                setRange(next);
                setPage(1);
                setFilters((f) => ({ ...f, from: next.from, to: next.to }));
              }}
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
            <div className="empty-block__icon">
              <i className="fa-solid fa-star" aria-hidden />
            </div>
            <span className="heading-sm">
              暂无收藏
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>用户名</th>
                  <th>昵称</th>
                  <th>实验</th>
                  <th>路由</th>
                  <th>收藏时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={row.id}>
                    <td className="data-table__num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{row.username || "—"}</td>
                    <td>{row.nickname || "—"}</td>
                    <td>
                      {row.experimentId ? (
                        <Link href={`/experiments/${row.experimentId}/edit`}>
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

        {!loading && items.length > 0 ? (
          <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} variant="step" />
        ) : null}
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
