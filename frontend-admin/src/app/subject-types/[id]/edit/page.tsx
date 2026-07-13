"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SubjectTypeForm, { type SubjectTypeFormValues } from "@/components/SubjectTypeForm";
import { useToast } from "@/components/Toast";
import {
  deleteSubjectType,
  fetchMe,
  fetchSubjectType,
  updateSubjectType,
  type AdminProfile,
  type SubjectTypeRecord,
} from "@/lib/api";

export default function EditSubjectTypePage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const id = Number(params.id);

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [subjectType, setSubjectType] = useState<SubjectTypeRecord | null>(null);
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
    fetchSubjectType(id)
      .then(setSubjectType)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [admin, id]);

  async function handleSubmit(values: SubjectTypeFormValues) {
    if (!subjectType) return;
    setSubmitting(true);
    try {
      const { code: _code, ...payload } = values;
      const updated = await updateSubjectType(subjectType.id, payload);
      setSubjectType(updated);
      toast.success("学科分类已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!subjectType) return;
    setDeleting(true);
    try {
      await deleteSubjectType(subjectType.id);
      toast.success("学科分类已删除");
      router.replace("/subject-types");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setDeleting(false);
    }
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  if (Number.isNaN(id)) {
    return (
      <AdminShell admin={admin} title="编辑学科分类">
        <p className="form-error">无效的分类 ID</p>
      </AdminShell>
    );
  }

  if (loading) {
    return (
      <AdminShell admin={admin} title="编辑学科分类">
        <p className="caption">加载中…</p>
      </AdminShell>
    );
  }

  if (!subjectType) {
    return (
      <AdminShell admin={admin} title="编辑学科分类">
        <p className="form-error">{loadError || "分类不存在"}</p>
      </AdminShell>
    );
  }

  const initial: SubjectTypeFormValues = {
    code: subjectType.code,
    label: subjectType.label,
    description: subjectType.description ?? "",
    sortOrder: subjectType.sortOrder,
  };

  return (
    <AdminShell admin={admin} title="编辑学科分类">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">{subjectType.label}</h2>
          <p className="caption">
            代码 <code className="mono-tag">{subjectType.code}</code> · ID {subjectType.id}
          </p>
        </div>
        <button
          type="button"
          className="btn-pill btn-pill--outline btn-pill--sm row-actions__danger"
          onClick={() => setShowDelete(true)}
        >
          删除分类
        </button>
      </section>

      <section className="card card--elevated">
        <SubjectTypeForm
          initial={initial}
          mode="edit"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/subject-types")}
        />
      </section>

      {showDelete ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setShowDelete(false)}>
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-delete-subject-type-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="edit-delete-subject-type-title">
              确认删除学科分类？
            </h3>
            <p className="caption">
              将永久删除「{subjectType.label}」。若仍有实验关联，后端将拒绝删除。
            </p>
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
