/**
 * 全屏加载态：AuthGuard / 路由 Suspense / 实验分包共用一套画面，
 * 深色画布 + 原子徽章 + 虚线光子环，避免多段加载视觉突变。
 */
export default function LoadingScreen({
  title = "正在加载…",
  hint = "PHYSLAB · 3D 实验室",
}: {
  title?: string;
  hint?: string;
}) {
  return (
    <div className="kh-loading" role="status" aria-live="polite">
      <div className="kh-loading__badge" aria-hidden>
        <span className="kh-loading__orbit" />
        <i className="fa-solid fa-atom" />
      </div>
      <p className="kh-loading__title">{title}</p>
      <span className="kh-loading__hint">{hint}</span>
    </div>
  );
}
