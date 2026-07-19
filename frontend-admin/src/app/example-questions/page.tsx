"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";
import {
  createExampleQuestion,
  deleteExampleQuestion,
  fetchExampleQuestions,
  fetchMe,
  updateExampleQuestion,
  type AdminProfile,
  type ExampleQuestionInput,
  type ExampleQuestionRecord,
} from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const EMPTY_FORM: ExampleQuestionInput = {
  title: "",
  description: "",
  question: "",
  sortOrder: 0,
};

export default function ExampleQuestionsPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [items, setItems] = useState<ExampleQuestionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<ExampleQuestionRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ExampleQuestionInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExampleQuestionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchExampleQuestions({ q: query || undefined, size: 100 });
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

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCreating(true);
  }

  function openEdit(row: ExampleQuestionRecord) {
    setCreating(false);
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description ?? "",
      question: row.question,
      sortOrder: row.sortOrder ?? 0,
    });
  }

  function closeForm() {
    setCreating(false);
    setEditing(null);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: ExampleQuestionInput = {
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      question: form.question.trim(),
      sortOrder: Number(form.sortOrder) || 0,
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

  if (!admin) return <div className="auth-loading">加载中…</div>;

  const formOpen = creating || editing != null;

  return (
    <AdminShell admin={admin} title="示例问题">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">示例问题管理</h2>
          <p className="caption">配置用户端 AI 助手欢迎区的推荐问法（共 {total} 条）</p>
        </div>
        <button type="button" className="btn-pill btn-pill--primary btn-pill--sm" onClick={openCreate}>
          + 新增示例
        </button>
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
              placeholder="搜索标题 / 描述 / 问题…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-pill btn-pill--outline btn-pill--sm">
              搜索
            </button>
            <button
              type="button"
              className="btn-pill btn-pill--ghost btn-pill--sm"
              onClick={() => loadList()}
            >
              刷新
            </button>
          </form>
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">?</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
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
                  <th>标题</th>
                  <th>描述</th>
                  <th>示例问题</th>
                  <th>排序</th>
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
                    <td className="data-table__desc">
                      {row.question.length > 48 ? `${row.question.slice(0, 48)}…` : row.question}
                    </td>
                    <td className="data-table__num">{row.sortOrder}</td>
                    <td className="data-table__time">{formatDateTime(row.updateTime)}</td>
                    <td>
                      <div className="row-actions">
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
      </section>

      {formOpen ? (
        <div className="modal-overlay" role="presentation" onClick={() => !saving && closeForm()}>
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520 }}
          >
            <h3 className="heading-sm">{editing ? "编辑示例问题" : "新增示例问题"}</h3>
            <form className="experiment-form" onSubmit={handleSave} style={{ marginTop: 16 }}>
              <div className="form-grid">
                <div className="field field--full">
                  <label htmlFor="eq-title">标题</label>
                  <input
                    id="eq-title"
                    className="text-input"
                    value={form.title}
                    maxLength={100}
                    required
                    placeholder="如：实验原理"
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
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
                    className="text-input text-input--textarea"
                    rows={3}
                    maxLength={500}
                    required
                    placeholder="用户点击后发送的完整问法"
                    value={form.question}
                    onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label htmlFor="eq-sort">排序</label>
                  <input
                    id="eq-sort"
                    className="text-input"
                    type="number"
                    value={form.sortOrder ?? 0}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
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
