"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { fetchDashboardSummary, fetchMe, type AdminProfile, type DashboardSummary } from "@/lib/api";

function formatStat(value: number | null) {
  return value === null ? "—" : String(value);
}

export default function DashboardPage() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
    fetchDashboardSummary()
      .then((data) => {
        setSummary(data);
        setSummaryError(false);
      })
      .catch(() => {
        setSummary(null);
        setSummaryError(true);
      });
  }, []);

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  const stats = [
    { label: "注册用户", value: summary?.userCount ?? null },
    { label: "实验数量", value: summary?.experimentCount ?? null },
    { label: "今日访问", value: summary?.todayVisitCount ?? null },
    { label: "活跃实验", value: summary?.activeExperimentCount ?? null, featured: true },
  ];

  return (
    <AdminShell admin={admin} title="首页">
      <section className="hero-band">
        <div className="hero-band__text">
          <span className="eyebrow">欢迎回来，{admin.displayName}</span>
          <h2>管理控制台</h2>
          <p>在此管理物理实验内容、用户与系统配置。当前为壳层，功能模块待后续实现。</p>
        </div>
        <div className="quick-actions">
          <button type="button" className="btn-pill btn-pill--primary btn-pill--sm" disabled>
            新建实验
          </button>
          <button type="button" className="btn-pill btn-pill--outline btn-pill--sm" disabled>
            查看用户
          </button>
        </div>
      </section>

      <section>
        <div className="stat-grid">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`stat-card${stat.featured ? " card--featured" : ""}`}
              style={stat.featured ? { padding: "20px 24px" } : undefined}
            >
              <span className="stat-card__value">{formatStat(stat.value)}</span>
              <span className="stat-card__label">{stat.label}</span>
              <span className="stat-card__delta">{summaryError ? "加载失败" : "待接入"}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">最近活动</span>
            <span className="pill-tag pill-tag--shade">占位</span>
          </div>
          <div className="placeholder-list">
            {[60, 80, 60].map((width, i) => (
              <div key={i} className="placeholder-row">
                <span className="placeholder-row__dot" />
                <div>
                  <div className={`placeholder-skeleton placeholder-skeleton--w${width}`} />
                  <div className="placeholder-skeleton placeholder-skeleton--w40" style={{ marginTop: 6 }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">快捷入口</span>
          </div>
          <div className="placeholder-list">
            {["实验管理", "用户列表", "系统设置"].map((title) => (
              <div key={title} className="placeholder-row">
                <span className="placeholder-row__dot" style={{ background: "var(--aloe-10)" }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: "var(--shade-70)" }}>{title}</span>
                <span className="pill-tag pill-tag--mint">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="empty-block">
        <div className="empty-block__icon">+</div>
        <span className="heading-sm" style={{ color: "var(--shade-50)" }}>
          更多模块区域
        </span>
        <p className="caption">图表、数据表格等组件将在此区域展开</p>
      </section>
    </AdminShell>
  );
}
