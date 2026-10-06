"use client";

/** Center-bottom teaching caption with prev / next / stop. */
export function DemoCaptionBar({
  label,
  text,
  visible,
  captionsOn = true,
  showPrev,
  showNext,
  nextLabel = "下一步 ›",
  prevLabel = "‹ 上一步",
  onPrev,
  onNext,
  onStop,
}: {
  label?: string;
  text: string;
  visible: boolean;
  /** 字幕开关：关闭后隐藏讲解文本，仅保留控制按钮（紧凑横条） */
  captionsOn?: boolean;
  showPrev?: boolean;
  showNext?: boolean;
  nextLabel?: string;
  prevLabel?: string;
  onPrev?: () => void;
  onNext?: () => void;
  onStop?: () => void;
}) {
  if (!visible || !text.trim()) return null;
  const showNav = (showPrev && onPrev) || (showNext && onNext);
  return (
    <div
      className={`demo-caption${captionsOn ? "" : " demo-caption--nocap"}`}
      role="status"
    >
      {onStop ? (
        <button type="button" className="demo-caption__stop" onClick={onStop}>
          ✕ 关闭讲解
        </button>
      ) : null}
      {captionsOn && label ? <small>{label}</small> : null}
      {captionsOn ? <p>{text}</p> : null}
      {showNav ? (
        <div className="demo-caption__nav">
          {showPrev && onPrev ? (
            <button type="button" className="demo-caption__nav-btn" onClick={onPrev}>
              {prevLabel}
            </button>
          ) : (
            <span />
          )}
          {showNext && onNext ? (
            <button type="button" className="demo-caption__nav-btn primary" onClick={onNext}>
              {nextLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
