"use client";

export function DemoPlanCard({
  demoId,
  title,
  overview,
  steps,
  onStart,
}: {
  demoId: number;
  title: string;
  overview?: string;
  steps?: number;
  onStart: (demoId: number) => void;
}) {
  return (
    <div className="demo-plan-card">
      <div className="demo-plan-card__head">
        <span className="demo-plan-card__ico">✦</span>
        <span>演示计划</span>
        <span className="demo-plan-card__state">待你确认</span>
      </div>
      <h5 className="demo-plan-card__title">{title || `演示 #${demoId}`}</h5>
      {overview ? <p className="demo-plan-card__ov">{overview}</p> : null}
      {typeof steps === "number" ? (
        <p className="demo-plan-card__meta">{steps} 步 · AI 只生成计划，执行由你点击触发</p>
      ) : null}
      <div className="demo-plan-card__actions">
        <button type="button" className="demo-plan-card__btn primary" onClick={() => onStart(demoId)}>
          ▶ 开始演示
        </button>
      </div>
    </div>
  );
}
