"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteSubjectType,
  fetchMe,
  fetchSubjectTypes,
  type AdminProfile,
  type SubjectTypeRecord,
} from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

export default function SubjectTypesPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<SubjectTypeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SubjectTypeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchSubjectTypes();
      setItems(data.items ?? []);
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
      await deleteSubjectType(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("学科分类已删除");
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
    <AdminShell admin={admin} title="学科分类">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">学科分类</h2>
          <p className="caption">管理实验学科分类，供实验表单下拉选择</p>
        </div>
        <Link href="/subject-types/new" className="btn-pill btn-pill--primary btn-pill--sm">
          新建分类
        </Link>
      </section>

      <section className="card card--elevated">
        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : (items?.length ?? 0) === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">◎</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              暂无学科分类
            </span>
            <p className="caption">创建第一个学科分类</p>
            <Link href="/subject-types/new" className="btn-pill btn-pill--primary btn-pill--sm">
              新建分类
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>代码</th>
                  <th>名称</th>
                  <th>描述</th>
                  <th>排序</th>
                  <th>实验数</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="mono-tag">{item.code}</code>
                    </td>
                    <td>
                      <span className="data-table__title">{item.label}</span>
                    </td>
                    <td className="data-table__desc">{item.description || "—"}</td>
                    <td className="data-table__num">{item.sortOrder ?? "—"}</td>
                    <td className="data-table__num">
                      {item.experimentCount !== undefined ? formatCount(item.experimentCount) : "—"}
                    </td>
                    <td className="data-table__time">{formatDateTime(item.updateTime)}</td>
                    <td>
                      <div className="row-actions">
                        <Link href={`/subject-types/${item.id}/edit`} className="btn-pill btn-pill--ghost btn-pill--sm">
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
            aria-labelledby="delete-subject-type-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="delete-subject-type-title">
              确认删除学科分类？
            </h3>
            <p className="caption">
              将永久删除「{deleteTarget.label}」（{deleteTarget.code}）。若仍有实验关联，后端将拒绝删除。
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
