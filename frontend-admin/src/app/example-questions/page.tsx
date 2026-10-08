"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import RowDetailButton from "@/components/RowDetailButton";
import { useAdmin } from "@/components/AdminProvider";
import IconPicker, { iconLabel } from "@/components/IconPicker";
import { useToast } from "@/components/Toast";
import {
  createExampleQuestion,
  deleteExampleQuestion,
  fetchExampleQuestions,
  reorderExampleQuestions,
  updateExampleQuestion,
  type ExampleQuestionInput,
  type ExampleQuestionRecord,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { useDragList } from "@/lib/useDragList";
import Pager from "@/components/Pager";

const PAGE_SIZE = 10;

const EMPTY_FORM: ExampleQuestionInput = {
  title: "",
  description: "",
  icon: "",
  question: "",
};

export default function ExampleQuestionsPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [items, setItems] = useState<ExampleQuestionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ExampleQuestionRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ExampleQuestionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; question?: string }>({});
  const [deleteTarget, setDeleteTarget] = useState<ExampleQuestionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  // 排序模式：拖拽全量列表后一次性保存
  const [sortMode, setSortMode] = useState(false);
  const [sortLoading, setSortLoading] = useState(false);
  const [savingSort, setSavingSort] = useState(false);
  const drag = useDragList<ExampleQuestionRecord>();

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchExampleQuestions({ page, size: PAGE_SIZE });
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

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setCreating(true);
  }

  function openEdit(row: ExampleQuestionRecord) {
    setCreating(false);
    setEditing(row);
    setFieldErrors({});
    setForm({
      title: row.title,
      description: row.description ?? "",
      icon: row.icon ?? "",
      question: row.question,
    });
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    const values = { title: form.title.trim(), question: form.question.trim() };
    const nextErrors = {
      title: values.title ? undefined : "请输入标题",
      question: values.question ? undefined : "请输入示例问题",
    };
    if (nextErrors.title || nextErrors.question) {
      setFieldErrors(nextErrors);
      return;
    }
    setSaving(true);
    const payload: ExampleQuestionInput = {
      title: values.title,
      description: form.description?.trim() || undefined,
      icon: form.icon?.trim() || undefined,
      question: values.question,
    };
    try {
      if (editing) {
        await updateExampleQuestion(editing.id, payload);
        toast.success("已保存");
      } else {
        await createExampleQuestion(payload);
        toast.success("已新增");
      }
      closeForm();
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExampleQuestion(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("已删除");
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
      const data = await fetchExampleQuestions({ page: 1, size: 1000 });
      drag.reset(data.records ?? []);
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
      await reorderExampleQuestions(drag.items.map((row) => row.id));
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

  const formOpen = creating || editing != null;

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">示例问题管理</h2>
          <p className="caption">列表顺序即用户端展示顺序，点「调整排序」拖拽设置</p>
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
          <button type="button" className="btn-pill btn-pill--primary btn-pill--sm" onClick={openCreate}>
            + 新增示例
          </button>
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
                    <th>标题</th>
                    <th>描述</th>
                    <th>示例问题</th>
                  </tr>
                </thead>
                <tbody>
                  {drag.items.map((row, i) => (
                    <tr
                      key={row.id}
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
                        <span className="data-table__title">
                          {row.icon ? (
                            <i className={`fa-solid ${row.icon} data-table__icon`} aria-hidden />
                          ) : null}
                          {row.title}
                        </span>
                      </td>
                      <td className="data-table__desc">{row.description || "—"}</td>
                      <td className="data-table__desc">{row.question}</td>
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
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">
              <i className="fa-solid fa-circle-question" aria-hidden />
            </div>
            <span className="heading-sm">
              暂无示例问题
            </span>
            <button type="button" className="btn-pill btn-pill--primary btn-pill--sm" onClick={openCreate}>
              新增第一条
            </button>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>标题</th>
                  <th>描述</th>
                  <th>示例问题</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={row.id}>
                    <td className="data-table__num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>
                      <span className="data-table__title">
                        {row.icon ? (
                          <i className={`fa-solid ${row.icon} data-table__icon`} aria-hidden />
                        ) : null}
                        {row.title}
                      </span>
                    </td>
                    <td className="data-table__desc">{row.description || "—"}</td>
                    <td className="data-table__desc">{row.question}</td>
                    <td className="data-table__time">{formatDateTime(row.updateTime)}</td>
                    <td>
                      <div className="row-actions">
                        <RowDetailButton
                          title="示例问题详情"
                          fields={[
                            { label: "标题", value: row.title },
                            { label: "描述", value: row.description || "—" },
                            {
                              label: "图标",
                              value: row.icon ? (
                                <span className="detail-grid__icon">
                                  <i className={`fa-solid ${row.icon}`} aria-hidden />
                                  {iconLabel(row.icon) ?? row.icon}
                                </span>
                              ) : (
                                "—"
                              ),
                            },
                            { label: "示例问题", value: row.question },
                            { label: "更新时间", value: formatDateTime(row.updateTime) },
                          ]}
                        />
                        <button
                          type="button"
                          className="btn-pill btn-pill--ghost btn-pill--sm"
                          onClick={() => openEdit(row)}
                        >
                          编辑
                        </button>
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
      )}

      {formOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => !saving && closeForm()}>
          <div
            className="modal card card--elevated mw-520"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm">{editing ? "编辑示例问题" : "新增示例问题"}</h3>
            <form className="experiment-form mt-16" onSubmit={handleSave} noValidate>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="eq-title">标题</label>
                  <input
                    id="eq-title"
                    className={`text-input${fieldErrors.title ? " is-invalid" : ""}`}
                    value={form.title}
                    maxLength={100}
                    required
                    placeholder="如：实验原理"
                    aria-invalid={!!fieldErrors.title}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, title: e.target.value }));
                      setFieldErrors((prev) => (prev.title ? { ...prev, title: undefined } : prev));
                    }}
                  />
                  {fieldErrors.title ? (
                    <p className="auth-field-error" role="alert">
                      <i className="fa-solid fa-circle-exclamation" aria-hidden />
                      {fieldErrors.title}
                    </p>
                  ) : null}
                </div>
                <IconPicker
                  label="图标（可选）"
                  value={form.icon ?? ""}
                  onChange={(icon) => setForm((f) => ({ ...f, icon }))}
                  hint="用户端示例问题卡片上展示的图标；不选则不显示"
                />
                <div className="field field--full">
                  <label htmlFor="eq-desc">描述</label>
                  <input
                    id="eq-desc"
                    className="text-input"
                    value={form.description ?? ""}
                    maxLength={200}
                    placeholder="简短说明（可选）"
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="field field--full">
                  <label htmlFor="eq-question">示例问题</label>
                  <textarea
                    id="eq-question"
                    className={`text-input text-input--textarea${fieldErrors.question ? " is-invalid" : ""}`}
                    rows={3}
                    maxLength={500}
                    required
                    placeholder="用户点击后发送的完整问法"
                    value={form.question}
                    aria-invalid={!!fieldErrors.question}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, question: e.target.value }));
                      setFieldErrors((prev) => (prev.question ? { ...prev, question: undefined } : prev));
                    }}
                  />
                  {fieldErrors.question ? (
                    <p className="auth-field-error" role="alert">
                      <i className="fa-solid fa-circle-exclamation" aria-hidden />
                      {fieldErrors.question}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-pill btn-pill--outline btn-pill--sm"
                  onClick={closeForm}
                  disabled={saving}
                >
                  取消
                </button>
                <button type="submit" className="btn-pill btn-pill--primary btn-pill--sm" disabled={saving}>
                  {saving ? "保存中…" : "保存"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal card card--elevated" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-sm">确认删除？</h3>
            <p className="caption">将删除示例「{deleteTarget.title}」，用户端欢迎区不再展示。</p>
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
                className="btn-pill btn-pill--primary btn-pill--sm"
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
