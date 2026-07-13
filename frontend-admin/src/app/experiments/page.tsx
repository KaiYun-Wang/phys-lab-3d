"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  deleteExperiment,
  fetchExperiments,
  fetchMe,
  fetchSubjectTypes,
  getExperimentStatusLabel,
  getExperimentSubjectLabel,
  getFallbackSubjectTypes,
  isExperimentPublished,
  type AdminProfile,
  type Experiment,
  type ExperimentStatus,
  type SubjectTypeRecord,
} from "@/lib/api";
import { resolveCoverUrl } from "@/lib/covers";
import { formatCount, formatDateTime } from "@/lib/format";
import { useToast } from "@/components/Toast";

type StatusFilter = ExperimentStatus | "all";

export default function ExperimentsPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<Experiment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [subjectTypes, setSubjectTypes] = useState<SubjectTypeRecord[]>([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchExperiments({ q: query || undefined, status: statusFilter });
      setExperiments(data.items ?? []);
    } catch (err) {
      setExperiments([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [query, statusFilter]);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    fetchSubjectTypes()
      .then((data) => {
        const types = data.items ?? [];
        setSubjectTypes(types.length > 0 ? types : getFallbackSubjectTypes());
      })
      .catch(() => setSubjectTypes(getFallbackSubjectTypes()));
  }, []);

  useEffect(() => {
    if (admin) loadList();
  }, [admin, loadList]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExperiment(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("实验已删除");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="实验管理">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">实验列表</h2>
          <p className="caption">管理实验元数据、封面与发布状态</p>
        </div>
        <Link href="/experiments/new" className="btn-pill btn-pill--primary btn-pill--sm">
          新建实验
        </Link>
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
              placeholder="搜索标题、路由…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-pill btn-pill--outline btn-pill--sm">
              搜索
            </button>
          </form>
          <select
            className="text-input table-toolbar__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            aria-label="状态筛选"
          >
            <option value="all">全部状态</option>
            <option value="PUBLISHED">已发布</option>
            <option value="DRAFT">草稿</option>
          </select>
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : (experiments?.length ?? 0) === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">⚗</div>
            <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
              暂无实验
            </span>
            <p className="caption">创建第一个实验或调整搜索条件</p>
            <Link href="/experiments/new" className="btn-pill btn-pill--primary btn-pill--sm">
              新建实验
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>封面</th>
                  <th>标题</th>
                  <th>学科</th>
                  <th>路由</th>
                  <th>状态</th>
                  <th>访客</th>
                  <th>收藏</th>
                  <th>浏览</th>
                  <th>评论</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {experiments.map((exp) => {
                  const coverSrc = resolveCoverUrl(exp.coverUrl);
                  return (
                    <tr key={exp.id}>
                      <td>
                        <div className="cover-thumb">
                          {coverSrc ? (
                            <img src={coverSrc} alt="" />
                          ) : (
                            <span className="cover-thumb__fallback" />
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="data-table__title">{exp.title}</span>
                      </td>
                      <td>{getExperimentSubjectLabel(exp, subjectTypes)}</td>
                      <td>
                        <code className="mono-tag">{exp.route}</code>
                      </td>
                      <td>
                        <span
                          className={`pill-tag ${isExperimentPublished(exp.status) ? "pill-tag--mint" : "pill-tag--shade"}`}
                        >
                          {getExperimentStatusLabel(exp.status)}
                        </span>
                      </td>
                      <td className="data-table__num">{formatCount(exp.visitorCount)}</td>
                      <td className="data-table__num">{formatCount(exp.favoriteCount)}</td>
                      <td className="data-table__num">{formatCount(exp.viewCount)}</td>
                      <td className="data-table__num">{formatCount(exp.commentCount)}</td>
                      <td className="data-table__time">{formatDateTime(exp.updateTime)}</td>
                      <td>
                        <div className="row-actions">
                          <Link href={`/experiments/${exp.id}/edit`} className="btn-pill btn-pill--ghost btn-pill--sm">
                            编辑
                          </Link>
                          <button
                            type="button"
                            className="btn-pill btn-pill--ghost btn-pill--sm row-actions__danger"
                            onClick={() => setDeleteTarget(exp)}
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="delete-title">
              确认删除实验？
            </h3>
            <p className="caption">
              将永久删除「{deleteTarget.title}」（{deleteTarget.route}）。此操作不可撤销。
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
