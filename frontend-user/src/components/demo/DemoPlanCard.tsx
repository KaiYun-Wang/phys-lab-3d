"use client";

export function DemoPlanCard({
  demoId,
  title,
  overview,
  steps,
  currentStep,
  quizStatus,
  active,
  onStart,
}: {
  demoId: number;
  title: string;
  overview?: string;
  steps?: number;
  /** 列表场景：已播完步数 */
  currentStep?: number;
  /** 列表场景：答题状态文案 */
  quizStatus?: string;
  active?: boolean;
  onStart: (demoId: number) => void;
}) {
  const listMode = typeof currentStep === "number" && typeof steps === "number";
  const pct =
    listMode && steps! > 0 ? Math.min(100, Math.round((currentStep! / steps!) * 100)) : 0;
  const stateLabel = listMode
    ? currentStep! >= steps!
      ? "已看完"
      : currentStep! > 0
        ? "进行中"
        : "未开始"
    : null;

  return (
    <div className={`demo-plan-card${active ? " is-active" : ""}${listMode ? " demo-plan-card--list" : ""}`}>
      <div className="demo-plan-card__head">
        <span className="demo-plan-card__ico">✦</span>
        <span>{listMode ? "教学演示" : "演示计划"}</span>
        {stateLabel ? <span className="demo-plan-card__state">{stateLabel}</span> : null}
      </div>
      <h5 className="demo-plan-card__title">{title || `演示 #${demoId}`}</h5>
      {overview ? <p className="demo-plan-card__ov">{overview}</p> : null}
      {listMode ? (
        <>
          <div className="demo-plan-card__bar" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </div>
          <p className="demo-plan-card__meta">
            {currentStep}/{steps} 步
            {quizStatus ? ` · ${quizStatus}` : ""}
          </p>
        </>
      ) : typeof steps === "number" ? (
        <p className="demo-plan-card__meta">{steps} 步 · 点开始后在演示面板播放</p>
      ) : null}
      <div className="demo-plan-card__actions">
        <button type="button" className="demo-plan-card__btn primary" onClick={() => onStart(demoId)}>
          {listMode
            ? currentStep! > 0 && currentStep! < steps!
              ? "▶ 继续"
              : currentStep! >= steps! && steps! > 0
                ? "打开"
                : "▶ 开始"
            : "▶ 开始演示"}
        </button>
      </div>
    </div>
  );
}
