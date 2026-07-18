"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import ExperimentForm, { type ExperimentFormValues } from "@/components/ExperimentForm";
import { useToast } from "@/components/Toast";
import { createExperiment, fetchMe, type AdminProfile } from "@/lib/api";

const DEFAULT_VALUES: ExperimentFormValues = {
  route: "",
  title: "",
  subjectTypeId: 1,
  description: "",
  coverUrl: "",
  topics: [],
  status: "DRAFT",
};

export default function NewExperimentPage() {
  const router = useRouter();
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  async function handleSubmit(values: ExperimentFormValues) {
    setSubmitting(true);
    try {
      const created = await createExperiment(values);
      toast.success("实验已创建");
      router.replace(`/experiments/${created.id}/edit`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
      setSubmitting(false);
    }
  }

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="新建实验">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">新建实验</h2>
          <p className="caption">填写元数据；路由需与用户端 3D registry 一致</p>
        </div>
      </section>

      <section className="card card--elevated">
        <ExperimentForm
          initial={DEFAULT_VALUES}
          mode="create"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/experiments")}
        />
      </section>
    </AdminShell>
  );
}
