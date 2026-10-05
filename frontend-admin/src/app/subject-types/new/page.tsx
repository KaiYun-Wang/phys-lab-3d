"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminShell from "@/components/AdminShell";
import PageCrumb from "@/components/PageCrumb";
import { useAdmin } from "@/components/AdminProvider";
import SubjectTypeForm, { type SubjectTypeFormValues } from "@/components/SubjectTypeForm";
import { useToast } from "@/components/Toast";
import { createSubjectType } from "@/lib/api";

const DEFAULT_VALUES: SubjectTypeFormValues = {
  code: "",
  label: "",
  description: "",
};

export default function NewSubjectTypePage() {
  const router = useRouter();
  const toast = useToast();
  const admin = useAdmin();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(values: SubjectTypeFormValues) {
    setSubmitting(true);
    try {
      const created = await createSubjectType(values);
      toast.success("学科分类已创建");
      router.replace(`/subject-types/${created.id}/edit`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建失败");
      setSubmitting(false);
    }
  }

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <PageCrumb parent="学科分类" parentHref="/subject-types">
            <h2 className="page-title">新建学科分类</h2>
          </PageCrumb>
        </div>
      </section>

      <section className="card card--elevated">
        <SubjectTypeForm
          initial={DEFAULT_VALUES}
          mode="create"
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/subject-types")}
        />
      </section>
    </AdminShell>
  );
}
