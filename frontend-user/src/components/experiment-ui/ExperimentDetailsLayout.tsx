import Link from "next/link";
import { ReactNode } from "react";

export interface ExperimentDetailsLayoutProps {
  title: string;
  backHref: string;
  children: ReactNode;
}

export function ExperimentDetailsLayout({ title, backHref, children }: ExperimentDetailsLayoutProps) {
  return (
    <main className="min-h-screen w-full bg-black">
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-[#45454f]">
        <div className="page-shell flex items-center justify-between gap-4 py-4">
          <div className="min-w-0">
            <h1 className="sx-display text-lg sm:text-xl truncate">{title}</h1>
            <p className="sx-eyebrow text-[#8a8a96] mt-1">实验详情</p>
          </div>
          <Link href={backHref} className="btn-ghost !min-h-[40px] !py-2 !px-4 !text-[11px] shrink-0">
            ← 返回实验
          </Link>
        </div>
      </header>

      <div className="page-shell py-6 sm:py-8 space-y-5 sm:space-y-6 pb-12">
        {children}
      </div>
    </main>
  );
}

export function DetailsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="sx-section">
      <h2 className="sx-display text-base sm:text-lg mb-4">{title}</h2>
      <div className="text-sm text-[#e8e8f0]/85 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export function DetailsFormulaCard({
  label,
  formula,
  description,
}: {
  label: string;
  formula: string;
  description?: string;
}) {
  return (
    <div className="sx-details-formula">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
        <span className="text-sm font-bold text-white">{label}</span>
        <code>{formula}</code>
      </div>
      {description && <p className="text-xs text-[#8a8a96]">{description}</p>}
    </div>
  );
}

export function DetailsLaunchButton({ href, label = "启动实验" }: { href: string; label?: string }) {
  return (
    <div className="flex justify-center pt-2">
      <Link href={href} className="btn-ghost !min-h-[48px] !px-8 !text-sm">
        {label}
      </Link>
    </div>
  );
}
