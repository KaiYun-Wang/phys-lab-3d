"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAdmin } from "@/components/AdminProvider";
import AdminSelect from "@/components/AdminSelect";
import DateRangePicker, { type DateRangeValue } from "@/components/DateRangePicker";
import { useToast } from "@/components/Toast";
import {
  fetchAdminUsers,
  updateAdminUserStatus,
  type AdminUser,
  type UserStatus,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import Pager from "@/components/Pager";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [filters, setFilters] = useState({ q: "", from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState<"all" | UserStatus>("all");
  const [busyId, setBusyId] = useState<number | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminUsers({
        q: filters.q || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
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
  }, [filters, statusFilter, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

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

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">用户列表</h2>
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
                q: search.trim(),
                from: range.from,
                to: range.to,
              });
            }}
          >
            <input
              className="text-input search-form__input"
              type="search"
              placeholder="用户 / 昵称"
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
          <AdminSelect
            className="table-toolbar__select"
            value={statusFilter}
            onChange={(v) => {
              setPage(1);
              setStatusFilter(v as "all" | UserStatus);
            }}
            ariaLabel="状态筛选"
            options={[
              { value: "all", label: "全部状态" },
              { value: "ENABLED", label: "正常" },
              { value: "DISABLED", label: "已禁用" },
            ]}
          />
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">
              <i className="fa-solid fa-users" aria-hidden />
            </div>
            <span className="heading-sm">
              暂无用户
            </span>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>用户名</th>
                    <th>昵称</th>
                    <th>状态</th>
                    <th>注册时间</th>
                    <th aria-label="操作" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, i) => {
                    const enabled = row.status === "ENABLED";
                    return (
                      <tr key={row.id}>
                        <td className="data-table__num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                        <td>
                          <span className="data-table__title">{row.username}</span>
                        </td>
                        <td>{row.nickname || "—"}</td>
                        <td>
                          <span className={`pill-tag ${enabled ? "pill-tag--ok" : "pill-tag--warn"}`}>
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
            {!loading && items.length > 0 ? (
              <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} variant="step" />
            ) : null}
          </>
        )}
      </section>
    </AdminShell>
  );
}
