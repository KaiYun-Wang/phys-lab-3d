"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteAnnouncement,
  fetchAnnouncements,
  fetchMe,
  type AdminProfile,
  type AnnouncementRecord,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function AnnouncementsPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AnnouncementRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAnnouncements();
      setItems(data.records ?? []);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

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

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="公告管理">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">公告管理</h2>
          <p className="caption">发布与管理用户端公告，登录后弹出最新一条</p>
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
            <div className="empty-block__icon">📢</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
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
                  <th>标题</th>
                  <th>正文摘要</th>
                  <th>发布时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="data-table__title">{item.title}</span>
                    </td>
                    <td className="data-table__desc">
                      {item.content.length > 60 ? `${item.content.slice(0, 60)}…` : item.content}
                    </td>
                    <td className="data-table__time">{formatDateTime(item.createTime)}</td>
                    <td>
                      <div className="row-actions">
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
