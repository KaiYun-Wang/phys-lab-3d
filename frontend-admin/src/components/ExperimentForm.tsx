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

type FieldErrors = { route?: string; title?: string; description?: string };

/** 创建模式下路由 slug 规则（与后端一致） */
const ROUTE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

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

  /** 单字段校验；返回错误文案或 undefined */
  function validateField(field: keyof FieldErrors, values: Record<string, string>): string | undefined {
    if (field === "route") {
      const v = values.route;
      if (!v) return "请输入路由 slug";
      if (!ROUTE_PATTERN.test(v)) return "仅支持小写字母、数字与连字符，如 double-slit";
      return undefined;
    }
    if (field === "title") return values.title ? undefined : "请输入标题";
    return values.description ? undefined : "请输入简介";
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleBlur(field: keyof FieldErrors) {
    const values = { route: route.trim(), title: title.trim(), description: description.trim() };
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, values) }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const values = { route: route.trim(), title: title.trim(), description: description.trim() };
    const nextErrors: FieldErrors = {
      // 编辑模式下路由只读，不校验
      route: mode === "create" ? validateField("route", values) : undefined,
      title: validateField("title", values),
      description: validateField("description", values),
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }
    onSubmit({
      route: values.route,
      title: values.title,
      subjectTypeId,
      description: values.description,
      // 空值必须显式发空串：后端 updateById 跳过 null 字段，省略字段会导致「删除封面」保存不生效
      coverUrl: coverUrl.trim(),
      topics: stringToTopics(topicsRaw),
      status,
    });
  }

  return (
    <form className="experiment-form" onSubmit={handleSubmit} noValidate>
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
                className={`text-input${fieldErrors.route ? " is-invalid" : ""}`}
                id="route"
                value={route}
                onChange={(e) => {
                  setRoute(e.target.value);
                  clearFieldError("route");
                }}
                onBlur={() => handleBlur("route")}
                placeholder="double-slit"
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                data-tooltip="小写字母、数字与连字符，如 double-slit"
                aria-invalid={!!fieldErrors.route}
                required
              />
              {fieldErrors.route ? (
                <p className="auth-field-error" role="alert">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden />
                  {fieldErrors.route}
                </p>
              ) : (
                <p className="field-hint">
                  与用户端 URL /experiments/&#123;route&#125; 及 3D 组件 registry 对应，创建后不可更改。
                </p>
              )}
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="title">标题</label>
          <input
            className={`text-input${fieldErrors.title ? " is-invalid" : ""}`}
            id="title"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              clearFieldError("title");
            }}
            onBlur={() => handleBlur("title")}
            placeholder="双缝实验"
            aria-invalid={!!fieldErrors.title}
            required
          />
          {fieldErrors.title ? (
            <p className="auth-field-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden />
              {fieldErrors.title}
            </p>
          ) : null}
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
            className={`text-input text-input--textarea${fieldErrors.description ? " is-invalid" : ""}`}
            id="description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError("description");
            }}
            onBlur={() => handleBlur("description")}
            rows={4}
            aria-invalid={!!fieldErrors.description}
            required
          />
          {fieldErrors.description ? (
            <p className="auth-field-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden />
              {fieldErrors.description}
            </p>
          ) : null}
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
