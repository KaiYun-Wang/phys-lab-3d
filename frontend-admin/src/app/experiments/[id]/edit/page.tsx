"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ExperimentForm, { type ExperimentFormValues } from "@/components/ExperimentForm";
import { useToast } from "@/components/Toast";
import {
  deleteExperiment,
  fetchExperiment,
  fetchMe,
  updateExperiment,
  type AdminProfile,
  type Experiment,
} from "@/lib/api";

export default function EditExperimentPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const id = Number(params.id);

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
    if (!admin || Number.isNaN(id)) return;
    setLoading(true);
    fetchExperiment(id)
      .then(setExperiment)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [admin, id]);

  async function handleSubmit(values: ExperimentFormValues) {
    if (!experiment) return;
    setSubmitting(true);
    try {
      const { route: _route, ...payload } = values;
      const updated = await updateExperiment(experiment.id, payload);
      setExperiment(updated);
      toast.success("实验已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!experiment) return;
    setDeleting(true);
    try {
      await deleteExperiment(experiment.id);
      toast.success("实验已删除");
      router.replace("/experiments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setShowDelete(false);
      setDeleting(false);
    }
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  if (Number.isNaN(id)) {
    return (
      <AdminShell admin={admin} title="编辑实验">
        <p className="form-error">无效的实验 ID</p>
      </AdminShell>
    );
  }

  if (loading) {
    return (
      <AdminShell admin={admin} title="编辑实验">
        <p className="caption">加载中…</p>
      </AdminShell>
    );
  }

  if (!experiment) {
    return (
      <AdminShell admin={admin} title="编辑实验">
        <p className="form-error">{loadError || "实验不存在"}</p>
      </AdminShell>
    );
  }

  const initial: ExperimentFormValues = {
    route: experiment.route,
    title: experiment.title,
    subjectTypeId: experiment.subjectTypeId,
    description: experiment.description,
    coverUrl: experiment.coverUrl ?? "",
    topics: experiment.topics,
    status: experiment.status,
  };

  return (
    <AdminShell admin={admin} title="编辑实验">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">{experiment.title}</h2>
          <p className="caption">
            路由 <code className="mono-tag">{experiment.route}</code> · ID {experiment.id}
          </p>
        </div>
        <button
          type="button"
          className="btn-pill btn-pill--outline btn-pill--sm row-actions__danger"
          onClick={() => setShowDelete(true)}
        >
          删除实验
        </button>
      </section>

      <section className="card card--elevated">
        <ExperimentForm
          initial={initial}
          mode="edit"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/experiments")}
        />
      </section>

      {showDelete ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setShowDelete(false)}>
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-delete-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="edit-delete-title">
              确认删除实验？
            </h3>
            <p className="caption">将永久删除「{experiment.title}」。此操作不可撤销。</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn-pill btn-pill--outline btn-pill--sm"
                onClick={() => setShowDelete(false)}
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
