"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import SubjectTypeForm, { type SubjectTypeFormValues } from "@/components/SubjectTypeForm";
import { useToast } from "@/components/Toast";
import { createSubjectType, fetchMe, type AdminProfile } from "@/lib/api";

const DEFAULT_VALUES: SubjectTypeFormValues = {
  code: "",
  label: "",
  description: "",
  sortOrder: 0,
};

export default function NewSubjectTypePage() {
  const router = useRouter();
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

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

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="新建学科分类">
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">新建学科分类</h2>
          <p className="caption">代码创建后不可修改</p>
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
