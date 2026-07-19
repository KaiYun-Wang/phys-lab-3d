"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";
import {
  fetchAdminUsers,
  fetchMe,
  updateAdminUserStatus,
  type AdminProfile,
  type AdminUser,
  type UserStatus,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminUsers({
        q: query || undefined,
        status: statusFilter,
        page,
        size: PAGE_SIZE,
      });
      setItems(data.records ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter, page]);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (admin) loadList();
  }, [admin, loadList]);

  async function toggleStatus(user: AdminUser) {
    const next: UserStatus = user.status === "ENABLED" ? "DISABLED" : "ENABLED";
    setBusyId(user.id);
    try {
      await updateAdminUserStatus(user.id, next);
      toast.success(next === "DISABLED" ? "已禁用该账号" : "已启用该账号");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusyId(null);
    }
  }

  if (!admin) return <div className="auth-loading">加载中…</div>;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminShell admin={admin} title="用户列表">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">用户列表</h2>
          <p className="caption">禁用后无法登录，历史评论与收藏等数据保留（共 {total} 人）</p>
        </div>
      </section>

      <section className="card card--elevated">
        <div className="table-toolbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setQuery(search.trim());
            }}
          >
            <input
              className="text-input search-form__input"
              type="search"
              placeholder="搜索用户名 / 昵称…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="text-input"
              style={{ width: 140 }}
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as "all" | UserStatus);
              }}
            >
              <option value="all">全部状态</option>
              <option value="ENABLED">正常</option>
              <option value="DISABLED">已禁用</option>
            </select>
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
            <div className="empty-block__icon">◉</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              暂无用户
            </span>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>用户</th>
                    <th>状态</th>
                    <th>注册时间</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => {
                    const enabled = row.status === "ENABLED";
                    return (
                      <tr key={row.id}>
                        <td className="data-table__num">{row.id}</td>
                        <td>
                          <span className="data-table__title">{row.nickname || row.username}</span>
                          <div className="caption">{row.username}</div>
                        </td>
                        <td>
                          <span className={`pill-tag ${enabled ? "pill-tag--mint" : "pill-tag--shade"}`}>
                            {enabled ? "正常" : "已禁用"}
                          </span>
                        </td>
                        <td className="data-table__time">{formatDateTime(row.createTime)}</td>
                        <td>
                          <button
                            type="button"
                            className={`btn-pill btn-pill--sm ${
                              enabled ? "btn-pill--ghost row-actions__danger" : "btn-pill--outline"
                            }`}
                            disabled={busyId === row.id}
                            onClick={() => toggleStatus(row)}
                          >
                            {busyId === row.id ? "处理中…" : enabled ? "禁用" : "启用"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 ? (
              <div className="table-pager">
                <button
                  type="button"
                  className="btn-pill btn-pill--outline btn-pill--sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  上一页
                </button>
                <span className="caption">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn-pill btn-pill--outline btn-pill--sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  下一页
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </AdminShell>
  );
}
