"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import { useAdmin } from "@/components/AdminProvider";
import AnimatedNumber from "@/components/AnimatedNumber";
import TrendChart from "@/components/TrendChart";
import {
  fetchDashboardAnalytics,
  fetchDashboardSummary,
  type DashboardAnalytics,
  type DashboardSummary,
} from "@/lib/api";

export default function DashboardPage() {
  const admin = useAdmin();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [analyticsError, setAnalyticsError] = useState(false);

  useEffect(() => {
    fetchDashboardSummary()
      .then((data) => setSummary(data))
      .catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    setAnalyticsError(false);
    fetchDashboardAnalytics(days)
      .then(setAnalytics)
      .catch(() => {
        setAnalytics(null);
        setAnalyticsError(true);
      });
  }, [days]);

  const stats = [
    { label: "注册用户", icon: "fa-users", tone: "sky", value: summary?.userCount ?? null },
    { label: "实验数量", icon: "fa-flask", tone: "ok", value: summary?.experimentCount ?? null },
    { label: "今日访问", icon: "fa-eye", tone: "warn", value: summary?.todayVisitCount ?? null },
    { label: "AI 提问", icon: "fa-robot", tone: "purple", value: summary?.aiQuestionCount ?? null },
  ];

  const shortcuts = [
    { title: "实验管理", href: "/experiments", icon: "fa-flask", tone: "ok" },
    { title: "用户列表", href: "/users", icon: "fa-users", tone: "sky" },
    { title: "知识库", href: "/knowledge", icon: "fa-book-open", tone: "purple" },
    { title: "公告管理", href: "/announcements", icon: "fa-bullhorn", tone: "warn" },
  ];

  const maxFavorite = Math.max(1, ...(analytics?.favoriteTop.map((i) => i.favoriteCount) ?? [1]));

  return (
    <AdminShell admin={admin}>
      <section className="hero-band">
        <div className="hero-band__text">
          <span className="eyebrow">欢迎回来，{admin.displayName}</span>
          <h2>管理控制台</h2>
        </div>
        <div className="quick-actions">
          <div className="range-toggle" role="group" aria-label="统计周期">
            <button
              type="button"
              className={`range-toggle__btn${days === 7 ? " is-active" : ""}`}
              onClick={() => setDays(7)}
            >
              近 7 日
            </button>
            <button
              type="button"
              className={`range-toggle__btn${days === 30 ? " is-active" : ""}`}
              onClick={() => setDays(30)}
            >
              近 30 日
            </button>
          </div>
          <Link href="/experiments/new" className="btn-pill btn-pill--primary btn-pill--sm">
            <i className="fa-solid fa-plus" aria-hidden />
            新建实验
          </Link>
        </div>
      </section>

      <section>
        <div className="stat-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card" data-tone={stat.tone}>
              <div className="stat-card__head">
                <i className={`fa-solid ${stat.icon}`} aria-hidden />
                <span className="stat-card__label">{stat.label}</span>
              </div>
              <span className="stat-card__value">
                <AnimatedNumber value={stat.value} />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="section-card__title">
              <i className="fa-solid fa-chart-line icon-toned" data-tone="sky" aria-hidden />
              <span className="heading-sm">访客趋势</span>
            </span>
            <span className="pill-tag pill-tag--neutral">近 {days} 日</span>
          </div>
          {analyticsError ? (
            <p className="caption">加载失败</p>
          ) : analytics ? (
            <TrendChart data={analytics.visitTrend} color="var(--accent)" />
          ) : (
            <p className="caption">加载中…</p>
          )}
        </div>

        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="section-card__title">
              <i className="fa-solid fa-user-plus icon-toned" data-tone="ok" aria-hidden />
              <span className="heading-sm">注册趋势</span>
            </span>
            <span className="pill-tag pill-tag--neutral">近 {days} 日</span>
          </div>
          {analyticsError ? (
            <p className="caption">加载失败</p>
          ) : analytics ? (
            <TrendChart data={analytics.registerTrend} color="var(--ok)" />
          ) : (
            <p className="caption">加载中…</p>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="section-card__title">
              <i className="fa-solid fa-star icon-toned" data-tone="warn" aria-hidden />
              <span className="heading-sm">实验收藏 Top</span>
            </span>
            <Link href="/favorites" className="pill-tag pill-tag--info">
              查看全部
              <i className="fa-solid fa-arrow-right" aria-hidden />
            </Link>
          </div>
          {!analytics ? (
            <p className="caption">{analyticsError ? "加载失败" : "加载中…"}</p>
          ) : analytics.favoriteTop.length === 0 ? (
            <p className="caption">暂无收藏数据</p>
          ) : (
            <div className="rank-list">
              {analytics.favoriteTop.map((item, index) => (
                <div key={item.experimentId} className="rank-row">
                  <span className="rank-row__idx">{index + 1}</span>
                  <div className="rank-row__body">
                    <div className="rank-row__title">{item.title}</div>
                    <div className="rank-row__bar">
                      <span
                        style={{
                          width: `${(item.favoriteCount / maxFavorite) * 100}%`,
                          animationDelay: `${index * 90}ms`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="rank-row__count">
                    <AnimatedNumber value={item.favoriteCount} duration={1000} delay={index * 90} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="section-card__title">
              <i className="fa-solid fa-robot icon-toned" data-tone="purple" aria-hidden />
              <span className="heading-sm">AI 辅导</span>
            </span>
            <Link href="/knowledge" className="pill-tag pill-tag--info">
              知识库
              <i className="fa-solid fa-arrow-right" aria-hidden />
            </Link>
          </div>
          {!analytics ? (
            <p className="caption">{analyticsError ? "加载失败" : "加载中…"}</p>
          ) : (
            <>
              <div className="ai-kpi-grid">
                <div className="ai-kpi">
                  <strong>
                    <AnimatedNumber value={analytics.ai.sessionCount} duration={1100} />
                  </strong>
                  <span>会话</span>
                </div>
                <div className="ai-kpi">
                  <strong>
                    <AnimatedNumber value={analytics.ai.questionCount} duration={1100} />
                  </strong>
                  <span>提问</span>
                </div>
                <div className="ai-kpi">
                  <strong>
                    <AnimatedNumber value={analytics.ai.avgSessionDepth} duration={1100} />
                  </strong>
                  <span>会话深度</span>
                </div>
              </div>
              <TrendChart data={analytics.ai.questionTrend} color="var(--accent-2)" height={140} />
            </>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="section-card__title">
              <i className="fa-solid fa-bolt icon-toned" data-tone="sky" aria-hidden />
              <span className="heading-sm">快捷入口</span>
            </span>
          </div>
          <div className="placeholder-list">
            {shortcuts.map((item) => (
              <div key={item.title} className="placeholder-row">
                <i className={`fa-solid ${item.icon} icon-toned`} data-tone={item.tone} aria-hidden />
                <Link href={item.href} className="quick-link">
                  {item.title}
                </Link>
                <Link href={item.href} className="pill-tag pill-tag--info" aria-label={`进入${item.title}`}>
                  <i className="fa-solid fa-arrow-right" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
