import Link from "next/link";
import { ReactNode } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { BrandLockup } from "@/components/BrandLogo";

export interface ExperimentDetailsLayoutProps {
  title: string;
  backHref: string;
  children: ReactNode;
}

export function ExperimentDetailsLayout({ title, backHref, children }: ExperimentDetailsLayoutProps) {
  return (
    <main className="exp-details">
      <header className="exp-details__header">
        <div className="page-shell exp-details__bar">
          <BrandLockup href="/" size={26} spin showTagline={false} />

          <nav className="exp-details__crumb" aria-label="位置">
            <Link href="/" className="exp-details__crumb-link">
              实验大厅
            </Link>
            <span className="exp-details__crumb-sep" aria-hidden>
              ›
            </span>
            <Link href={backHref} className="exp-details__crumb-link">
              {title}
            </Link>
            <span className="exp-details__crumb-sep" aria-hidden>
              ›
            </span>
            <span className="exp-details__crumb-here">实验详情</span>
          </nav>

          <Link href={backHref} className="exp-details__back">
            <ArrowLeft size={14} aria-hidden />
            返回实验
          </Link>
        </div>
      </header>

      <div className="page-shell exp-details__body">
        <h1 className="exp-details__title">{title}</h1>
        <p className="exp-details__subtitle">
          原理推导、核心公式与操作说明
        </p>
        {children}
      </div>
    </main>
  );
}

/** 章节：序号由 CSS 计数器自动生成（01 / 02 …），无需逐页传参 */
export function DetailsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="exp-details-section">
      <header className="exp-details-section__head">
        <h2>{title}</h2>
      </header>
      <div className="exp-details-section__body">{children}</div>
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
    <div className="exp-details-formula">
      <div className="exp-details-formula__row">
        <span className="exp-details-formula__label">{label}</span>
        <code>{formula}</code>
      </div>
      {description && <p className="exp-details-formula__desc">{description}</p>}
    </div>
  );
}

export function DetailsLaunchButton({ href, label = "启动实验" }: { href: string; label?: string }) {
  return (
    <div className="exp-details__launch">
      <Link href={href} className="btn-primary kh-press">
        <Play size={16} aria-hidden />
        {label}
      </Link>
    </div>
  );
}
