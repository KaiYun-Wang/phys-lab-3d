"use client";

import { FormEvent, useState } from "react";
import type { SubjectTypeInput } from "@/lib/api";

export type SubjectTypeFormValues = SubjectTypeInput;

type SubjectTypeFormProps = {
  initial: SubjectTypeFormValues;
  mode: "create" | "edit";
  submitting: boolean;
  error?: string;
  onSubmit: (values: SubjectTypeFormValues) => void;
  onCancel: () => void;
};

type FieldErrors = { code?: string; label?: string };

/** 创建模式下代码规则（与后端 @Pattern 一致） */
const CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export default function SubjectTypeForm({
  initial,
  mode,
  submitting,
  error,
  onSubmit,
  onCancel,
}: SubjectTypeFormProps) {
  const [code, setCode] = useState(initial.code);
  const [label, setLabel] = useState(initial.label);
  const [description, setDescription] = useState(initial.description ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  /** 单字段校验；返回错误文案或 undefined */
  function validateField(field: keyof FieldErrors, values: Record<string, string>): string | undefined {
    if (field === "code") {
      const v = values.code;
      if (!v) return "请输入代码";
      if (!CODE_PATTERN.test(v)) return "须为大写下划线枚举名，如 MECHANICS";
      return undefined;
    }
    return values.label ? undefined : "请输入名称";
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleBlur(field: keyof FieldErrors) {
    const values = { code: code.trim(), label: label.trim() };
    setFieldErrors((prev) => ({ ...prev, [field]: validateField(field, values) }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const values = { code: code.trim(), label: label.trim() };
    const nextErrors: FieldErrors = {
      // 编辑模式下代码只读，不校验
      code: mode === "create" ? validateField("code", values) : undefined,
      label: validateField("label", values),
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }
    onSubmit({
      code: values.code.toUpperCase(),
      label: values.label,
      description: description.trim() || undefined,
    });
  }

  return (
    <form className="experiment-form" onSubmit={handleSubmit} noValidate>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="code">代码</label>
          {mode === "edit" ? (
            <>
              <input
                className="text-input text-input--readonly"
                id="code"
                value={code}
                readOnly
                aria-describedby="code-hint"
              />
              <p className="field-hint field-hint--warn" id="code-hint">
                代码创建后不可修改，用于系统内部标识。
              </p>
            </>
          ) : (
            <>
              <input
                className={`text-input${fieldErrors.code ? " is-invalid" : ""}`}
                id="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  clearFieldError("code");
                }}
                onBlur={() => handleBlur("code")}
                placeholder="MECHANICS"
                pattern="[A-Z][A-Z0-9_]*"
                data-tooltip="大写字母、数字与下划线，如 MECHANICS"
                aria-invalid={!!fieldErrors.code}
                required
              />
              {fieldErrors.code ? (
                <p className="auth-field-error" role="alert">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden />
                  {fieldErrors.code}
                </p>
              ) : (
                <p className="field-hint">大写 slug 风格，如 MECHANICS、FLUID_MECHANICS。</p>
              )}
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="label">名称</label>
          <input
            className={`text-input${fieldErrors.label ? " is-invalid" : ""}`}
            id="label"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              clearFieldError("label");
            }}
            onBlur={() => handleBlur("label")}
            placeholder="力学"
            aria-invalid={!!fieldErrors.label}
            required
          />
          {fieldErrors.label ? (
            <p className="auth-field-error" role="alert">
              <i className="fa-solid fa-circle-exclamation" aria-hidden />
              {fieldErrors.label}
            </p>
          ) : null}
        </div>

        <div className="field field--full">
          <label htmlFor="description">描述</label>
          <textarea
            className="text-input text-input--textarea"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="可选说明"
          />
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions">
        <button type="button" className="btn-pill btn-pill--outline btn-pill--sm" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button type="submit" className="btn-pill btn-pill--primary btn-pill--sm" disabled={submitting}>
          {submitting ? "保存中…" : mode === "create" ? "创建分类" : "保存更改"}
        </button>
      </div>
    </form>
  );
}
