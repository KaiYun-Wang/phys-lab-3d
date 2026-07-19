"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import AnnouncementForm, { type AnnouncementFormValues } from "@/components/AnnouncementForm";
import { useToast } from "@/components/Toast";
import {
  deleteAnnouncement,
  fetchAnnouncement,
  fetchMe,
  updateAnnouncement,
  type AdminProfile,
  type AnnouncementRecord,
} from "@/lib/api";

export default function EditAnnouncementPage() {
  const router = useRouter();
  const toast = useToast();
  const params = useParams();
  const id = Number(params.id);

  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementRecord | null>(null);
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
    fetchAnnouncement(id)
      .then(setAnnouncement)
      .catch((err) => setLoadError(err instanceof Error ? err.message : "加载失败"))
      .finally(() => setLoading(false));
  }, [admin, id]);

  async function handleSubmit(values: AnnouncementFormValues) {
    if (!announcement) return;
    setSubmitting(true);
    try {
      const updated = await updateAnnouncement(announcement.id, values);
      setAnnouncement(updated);
      toast.success("公告已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!announcement) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(announcement.id);
      toast.success("公告已删除");
      router.replace("/announcements");
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
      <AdminShell admin={admin} title="编辑公告">
        <p className="form-error">无效的公告 ID</p>
      </AdminShell>
    );
  }

  if (loading) {
    return (
      <AdminShell admin={admin} title="编辑公告">
        <p className="caption">加载中…</p>
      </AdminShell>
    );
  }

  if (!announcement) {
    return (
      <AdminShell admin={admin} title="编辑公告">
        <p className="form-error">{loadError || "公告不存在"}</p>
      </AdminShell>
    );
  }

  const initial: AnnouncementFormValues = {
    title: announcement.title,
    content: announcement.content,
  };

  return (
    <AdminShell admin={admin} title="编辑公告">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">{announcement.title}</h2>
          <p className="caption">ID {announcement.id}</p>
        </div>
        <button
          type="button"
          className="btn-pill btn-pill--outline btn-pill--sm row-actions__danger"
          onClick={() => setShowDelete(true)}
        >
          删除公告
        </button>
      </section>

      <section className="card card--elevated">
        <AnnouncementForm
          initial={initial}
          mode="edit"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/announcements")}
        />
      </section>

      {showDelete ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setShowDelete(false)}>
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-delete-announcement-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm" id="edit-delete-announcement-title">
              确认删除公告？
            </h3>
            <p className="caption">将永久删除「{announcement.title}」。</p>
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
