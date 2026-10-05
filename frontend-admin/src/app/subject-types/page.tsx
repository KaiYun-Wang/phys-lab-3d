"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteSubjectType,
  fetchMe,
  fetchSubjectTypes,
  reorderSubjectTypes,
  type AdminProfile,
  type SubjectTypeRecord,
} from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";
import { useDragList } from "@/lib/useDragList";
import Pager from "@/components/Pager";
import { useToast } from "@/components/Toast";

const PAGE_SIZE = 10;

export default function SubjectTypesPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<SubjectTypeRecord[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SubjectTypeRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 排序模式：拖拽全量列表后一次性保存
  const [sortMode, setSortMode] = useState(false);
  const [sortLoading, setSortLoading] = useState(false);
  const [savingSort, setSavingSort] = useState(false);
  const drag = useDragList<SubjectTypeRecord>();

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

  async function enterSortMode() {
    setSortMode(true);
    setSortLoading(true);
    try {
      const data = await fetchSubjectTypes();
      drag.reset(data.items ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "加载排序列表失败");
      setSortMode(false);
    } finally {
      setSortLoading(false);
    }
  }

  function exitSortMode() {
    if (savingSort) return;
    setSortMode(false);
    drag.reset([]);
  }

  async function saveSort() {
    if (drag.items.length === 0) return;
    setSavingSort(true);
    try {
      await reorderSubjectTypes(drag.items.map((item) => item.id));
      toast.success("排序已保存");
      setSortMode(false);
      drag.reset([]);
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存排序失败");
    } finally {
      setSavingSort(false);
    }
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">学科分类</h2>
          <p className="caption">列表顺序即前台展示顺序，点「调整排序」拖拽设置</p>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="btn-pill btn-pill--outline btn-pill--sm"
            onClick={enterSortMode}
            disabled={sortMode || sortLoading}
          >
            {sortLoading ? "加载中…" : "调整排序"}
          </button>
          <Link href="/subject-types/new" className="btn-pill btn-pill--primary btn-pill--sm">
            新建分类
          </Link>
        </div>
      </section>

      {sortMode ? (
        <section className="card card--elevated">
          <div className="sort-toolbar">
            <p className="caption">拖拽行调整顺序（共 {drag.items.length} 个）</p>
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn-pill btn-pill--outline btn-pill--sm"
                onClick={exitSortMode}
                disabled={savingSort}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-pill btn-pill--primary btn-pill--sm"
                onClick={saveSort}
                disabled={savingSort || sortLoading}
              >
                {savingSort ? "保存中…" : "保存排序"}
              </button>
            </div>
          </div>

          {sortLoading ? (
            <p className="table-message caption">加载中…</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table sort-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>代码</th>
                    <th>名称</th>
                    <th>描述</th>
                    <th>实验数</th>
                  </tr>
                </thead>
                <tbody>
                  {drag.items.map((item, i) => (
                    <tr
                      key={item.id}
                      draggable
                      className={drag.draggingIndex === i ? "is-dragging" : undefined}
                      onDragStart={(e) => drag.onDragStart(e, i)}
                      onDragEnter={() => drag.onDragEnter(i)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      onDragEnd={drag.onDragEnd}
                    >
                      <td className="sort-table__pos">
                        <i className="fa-solid fa-grip-vertical sort-handle" aria-hidden />
                        {i + 1}
                      </td>
                      <td>
                        <code className="mono-tag">{item.code}</code>
                      </td>
                      <td>
                        <span className="data-table__title">{item.label}</span>
                      </td>
                      <td className="data-table__desc">{item.description || "—"}</td>
                      <td className="data-table__num">
                        {item.experimentCount !== undefined ? formatCount(item.experimentCount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
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
                  <th>实验数</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code className="mono-tag">{item.code}</code>
                    </td>
                    <td>
                      <span className="data-table__title">{item.label}</span>
                    </td>
                    <td className="data-table__desc">{item.description || "—"}</td>
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

        {!loading && items.length > 0 ? (
          <Pager
            page={currentPage}
            total={items.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            variant="jump"
          />
        ) : null}
      </section>
      )}

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
