"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import AnnouncementForm, { type AnnouncementFormValues } from "@/components/AnnouncementForm";
import { useToast } from "@/components/Toast";
import { createAnnouncement, fetchMe, type AdminProfile } from "@/lib/api";

const DEFAULT_VALUES: AnnouncementFormValues = {
  title: "",
  content: "",
};

export default function NewAnnouncementPage() {
  const router = useRouter();
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  async function handleSubmit(values: AnnouncementFormValues) {
    setSubmitting(true);
    try {
      const created = await createAnnouncement(values);
      toast.success("公告已发布");
      router.replace(`/announcements/${created.id}/edit`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发布失败");
      setSubmitting(false);
    }
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="发布公告">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">发布公告</h2>
          <p className="caption">用户登录后将弹出最新一条公告</p>
        </div>
      </section>

      <section className="card card--elevated">
        <AnnouncementForm
          initial={DEFAULT_VALUES}
          mode="create"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/announcements")}
        />
      </section>
    </AdminShell>
  );
}
