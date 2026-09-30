"use client";

/** Center-bottom teaching caption with prev / next / stop. */
export function DemoCaptionBar({
  label,
  text,
  visible,
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
    <div className="demo-caption" role="status">
      {onStop ? (
        <button type="button" className="demo-caption__stop" onClick={onStop}>
          ✕ 关闭讲解
        </button>
      ) : null}
      {label ? <small>{label}</small> : null}
      <p>{text}</p>
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
