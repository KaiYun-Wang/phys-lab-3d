"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import RowDetailButton from "@/components/RowDetailButton";
import { useAdmin } from "@/components/AdminProvider";
import {
  deleteAnnouncement,
  fetchAnnouncements,
  type AnnouncementRecord,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import Pager from "@/components/Pager";
import { useToast } from "@/components/Toast";

const PAGE_SIZE = 10;

export default function AnnouncementsPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnnouncements(page, PAGE_SIZE);
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
  }, [page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("公告已删除");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">公告管理</h2>
        </div>
        <Link href="/announcements/new" className="btn-pill btn-pill--primary btn-pill--sm">
          发布公告
        </Link>
      </section>

      <section className="card card--elevated">
        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : (items?.length ?? 0) === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">
              <i className="fa-solid fa-bullhorn" aria-hidden />
            </div>
            <span className="heading-sm">
              暂无公告
            </span>
            <p className="caption">发布第一条公告</p>
            <Link href="/announcements/new" className="btn-pill btn-pill--primary btn-pill--sm">
              发布公告
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>标题</th>
                  <th>描述</th>
                  <th>发布时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="data-table__num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <span className="data-table__title">
                        {item.icon ? (
                          <i className={`fa-solid ${item.icon} data-table__icon`} aria-hidden />
                        ) : null}
                        {item.title}
                      </span>
                    </td>
                    <td className="data-table__desc">{item.description || "—"}</td>
                    <td className="data-table__time">{formatDateTime(item.createTime)}</td>
                    <td>
                      <div className="row-actions">
                        <RowDetailButton
                          title="公告详情"
                          fields={[
                            { label: "标题", value: item.title },
                            { label: "描述", value: item.description || "—" },
                            { label: "图标", value: item.icon || "—" },
                            { label: "发布时间", value: formatDateTime(item.createTime) },
                          ]}
                        />
                        <Link
                          href={`/announcements/${item.id}/edit`}
                          className="btn-pill btn-pill--ghost btn-pill--sm"
                        >
                          编辑
                        </Link>
                        <button
                          type="button"
                          className="btn-pill btn-pill--ghost btn-pill--sm row-actions__danger"
                          onClick={() => setDeleteTarget(item)}
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
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-announcement-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="delete-announcement-title">
              确认删除公告？
            </h3>
            <p className="caption">将永久删除「{deleteTarget.title}」。</p>
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
