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
  const [sortOrder, setSortOrder] = useState(
    initial.sortOrder !== undefined ? String(initial.sortOrder) : "",
  );

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit({
      code: code.trim().toUpperCase(),
      label: label.trim(),
      description: description.trim() || undefined,
      sortOrder: sortOrder.trim() ? Number(sortOrder) : undefined,
    });
  }

  return (
    <form className="experiment-form" onSubmit={handleSubmit}>
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
                className="text-input"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="MECHANICS"
                pattern="[A-Z][A-Z0-9_]*"
                title="大写字母、数字与下划线，如 MECHANICS"
                required
              />
              <p className="field-hint">大写 slug 风格，如 MECHANICS、FLUID_MECHANICS。</p>
            </>
          )}
        </div>

        <div className="field">
          <label htmlFor="label">名称</label>
          <input
            className="text-input"
            id="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="力学"
            required
          />
        </div>

        <div className="field">
          <label htmlFor="sortOrder">排序</label>
          <input
            className="text-input"
            id="sortOrder"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            placeholder="0"
          />
          <p className="field-hint">数值越小越靠前，留空则按创建顺序。</p>
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
