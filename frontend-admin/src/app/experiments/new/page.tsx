"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAdmin } from "@/components/AdminProvider";
import ExperimentForm, { type ExperimentFormValues } from "@/components/ExperimentForm";
import { useToast } from "@/components/Toast";
import { createExperiment } from "@/lib/api";

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
  const admin = useAdmin();
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">新建实验</h2>
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
