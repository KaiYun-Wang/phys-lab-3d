"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminShell from "@/components/AdminShell";
import PageCrumb from "@/components/PageCrumb";
import { useAdmin } from "@/components/AdminProvider";
import AnnouncementForm, { type AnnouncementFormValues } from "@/components/AnnouncementForm";
import { useToast } from "@/components/Toast";
import { createAnnouncement } from "@/lib/api";

const DEFAULT_VALUES: AnnouncementFormValues = {
  title: "",
  description: "",
  icon: "",
  content: "",
};

export default function NewAnnouncementPage() {
  const router = useRouter();
  const toast = useToast();
  const admin = useAdmin();
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <PageCrumb parent="公告管理" parentHref="/announcements">
            <h2 className="page-title">发布公告</h2>
          </PageCrumb>
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
