"use client";

import { FormEvent, useEffect, useState } from "react";
import AdminSelect from "@/components/AdminSelect";
import CoverUploadField from "@/components/CoverUploadField";
import {
  EXPERIMENT_STATUS_OPTIONS,
  fetchSubjectTypes,
  getFallbackSubjectTypes,
  type ExperimentInput,
  type ExperimentStatus,
  type SubjectTypeRecord,
} from "@/lib/api";

export type ExperimentFormValues = ExperimentInput;

type ExperimentFormProps = {
  initial: ExperimentFormValues;
  mode: "create" | "edit";
  submitting: boolean;
  error?: string;
  onSubmit: (values: ExperimentFormValues) => void;
  onCancel: () => void;
};

function topicsToString(topics: string[]) {
  return topics.join(", ");
}

function stringToTopics(raw: string) {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function ExperimentForm({
  initial,
  mode,
  submitting,
  error,
  onSubmit,
  onCancel,
}: ExperimentFormProps) {
  const [route, setRoute] = useState(initial.route);
  const [title, setTitle] = useState(initial.title);
  const [subjectTypeId, setSubjectTypeId] = useState(initial.subjectTypeId);
  const [subjectTypes, setSubjectTypes] = useState<SubjectTypeRecord[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [description, setDescription] = useState(initial.description);
  const [coverUrl, setCoverUrl] = useState(initial.coverUrl ?? "");
  const [topicsRaw, setTopicsRaw] = useState(topicsToString(initial.topics));
  const [status, setStatus] = useState<ExperimentStatus>(initial.status);

  useEffect(() => {
    let cancelled = false;
    setTypesLoading(true);
    fetchSubjectTypes()
      .then((data) => {
        if (cancelled) return;
        const items = (data.items ?? []).length > 0 ? (data.items ?? []) : getFallbackSubjectTypes();
        setSubjectTypes(items);
        setSubjectTypeId((current) => (items.some((t) => t.id === current) ? current : items[0]?.id ?? current));
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = getFallbackSubjectTypes();
        setSubjectTypes(fallback);
        setSubjectTypeId((current) =>
          fallback.some((t) => t.id === current) ? current : fallback[0]?.id ?? current,
        );
      })
      .finally(() => {
        if (!cancelled) setTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      route: route.trim(),
      title: title.trim(),
      subjectTypeId,
      description: description.trim(),
      // 空值必须显式发空串：后端 updateById 跳过 null 字段，省略字段会导致「删除封面」保存不生效
      coverUrl: coverUrl.trim(),
      topics: stringToTopics(topicsRaw),
      status,
    });
  }

  return (
    <form className="experiment-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="route">路由 slug</label>
          {mode === "edit" ? (
            <>
              <input
                className="text-input text-input--readonly"
                id="route"
                value={route}
                readOnly
                aria-describedby="route-hint"
              />
              <p className="field-hint field-hint--warn" id="route-hint">
                路由与用户端 3D 页面绑定，创建后不可修改。如需更换请新建实验。
              </p>
            </>
          ) : (
            <>
              <input
                className="text-input"
                id="route"
                value={route}
                onChange={(e) => setRoute(e.target.value)}
                placeholder="double-slit"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                data-tooltip="小写字母、数字与连字符，如 double-slit"
                required
              />
              <p className="field-hint">
                与用户端 URL /experiments/&#123;route&#125; 及 3D 组件 registry 对应，创建后不可更改。
              </p>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="title">标题</label>
          <input
            className="text-input"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="双缝实验"
            required
          />
        </div>

        <div className="field">
          <label>学科</label>
          <AdminSelect
            value={String(subjectTypeId)}
            onChange={(v) => setSubjectTypeId(Number(v))}
            ariaLabel="学科"
            disabled={typesLoading || subjectTypes.length === 0}
            options={subjectTypes.map((opt) => ({ value: String(opt.id), label: opt.label }))}
          />
          {typesLoading ? <p className="field-hint">加载学科分类…</p> : null}
        </div>

        <div className="field">
          <label>状态</label>
          <AdminSelect
            value={status}
            onChange={(v) => setStatus(v as ExperimentStatus)}
            ariaLabel="状态"
            options={EXPERIMENT_STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>

        <div className="field field--full">
          <label htmlFor="description">简介</label>
          <textarea
            className="text-input text-input--textarea"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="field field--full">
          <span className="field-label">封面</span>
          <CoverUploadField value={coverUrl} onChange={setCoverUrl} disabled={submitting} />
        </div>

        <div className="field field--full">
          <label htmlFor="topics">标签（逗号分隔）</label>
          <input
            className="text-input"
            id="topics"
            value={topicsRaw}
            onChange={(e) => setTopicsRaw(e.target.value)}
            placeholder="量子, 波粒二象性, 干涉"
          />
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="button" className="btn-pill btn-pill--outline btn-pill--sm" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button type="submit" className="btn-pill btn-pill--primary btn-pill--sm" disabled={submitting}>
          {submitting ? "保存中…" : mode === "create" ? "创建实验" : "保存更改"}
        </button>
      </div>
    </form>
  );
}
