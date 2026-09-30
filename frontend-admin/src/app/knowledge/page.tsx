"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";
import {
  deleteKnowledgePage,
  fetchKnowledgePages,
  fetchMe,
  type AdminProfile,
  type KnowledgePage,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import Pager from "@/components/Pager";

const PAGE_SIZE = 10;

export default function KnowledgeListPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<KnowledgePage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<KnowledgePage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchKnowledgePages(page, PAGE_SIZE, query || undefined);
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
  }, [query, page]);

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
      await deleteKnowledgePage(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("已删除");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  if (!admin) return <div className="auth-loading">加载中…</div>;

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">知识页</h2>
        </div>
        <Link href="/knowledge/new" className="btn-pill btn-pill--primary btn-pill--sm">
          + 新增知识页
        </Link>
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
              placeholder="按文档名搜索…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-pill btn-pill--outline btn-pill--sm">
              搜索
            </button>
            <button
              type="button"
              className="btn-pill btn-pill--ghost btn-pill--sm"
              onClick={() => {
                setSearch("");
                setPage(1);
                setQuery("");
              }}
            >
              清空
            </button>
          </form>
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">📄</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              {query ? "无匹配知识页" : "暂无知识页"}
            </span>
            {!query ? (
              <Link href="/knowledge/new" className="btn-pill btn-pill--primary btn-pill--sm">
                新增第一篇
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>描述</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="data-table__title">{row.title}</span>
                    </td>
                    <td className="data-table__desc">{row.description || "—"}</td>
                    <td className="data-table__time">{formatDateTime(row.updateTime)}</td>
                    <td>
                      <div className="row-actions">
                        <Link
                          href={`/knowledge/${row.id}`}
                          className="btn-pill btn-pill--ghost btn-pill--sm"
                        >
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="btn-pill btn-pill--ghost btn-pill--sm row-actions__danger"
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

        {!loading && items.length > 0 ? (
          <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} variant="jump" />
        ) : null}
      </section>

      {deleteTarget ? (
        <div className="modal-overlay" role="dialog">
          <div className="modal card card--elevated">
            <h3 className="heading-sm">删除知识页</h3>
            <p className="caption" style={{ marginTop: 8 }}>
              确定删除「{deleteTarget.title}」？
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-pill btn-pill--ghost"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-pill btn-pill--primary"
                disabled={deleting}
                onClick={confirmDelete}
              >
                {deleting ? "删除中…" : "删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
