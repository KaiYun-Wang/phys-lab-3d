"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import TrendChart from "@/components/TrendChart";
import {
  fetchDashboardAnalytics,
  fetchDashboardSummary,
  fetchMe,
  type AdminProfile,
  type DashboardAnalytics,
  type DashboardSummary,
} from "@/lib/api";

function formatStat(value: number | null) {
  return value === null ? "—" : String(value);
}

function formatRate(rate: number | null | undefined) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

export default function DashboardPage() {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [summaryError, setSummaryError] = useState(false);
  const [analyticsError, setAnalyticsError] = useState(false);

  useEffect(() => {
    fetchMe().then(setAdmin).catch(() => setAdmin(null));
  }, []);

  useEffect(() => {
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

  useEffect(() => {
    setAnalyticsError(false);
    fetchDashboardAnalytics(days)
      .then(setAnalytics)
      .catch(() => {
        setAnalytics(null);
        setAnalyticsError(true);
      });
  }, [days]);

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  const stats = [
    { label: "注册用户", value: summary?.userCount ?? null },
    { label: "实验数量", value: summary?.experimentCount ?? null },
    { label: "今日访问", value: summary?.todayVisitCount ?? null },
    { label: "AI 提问", value: summary?.aiQuestionCount ?? null, featured: true },
  ];

  const maxFavorite = Math.max(1, ...(analytics?.favoriteTop.map((i) => i.favoriteCount) ?? [1]));

  return (
    <AdminShell admin={admin} title="首页">
      <section className="hero-band">
        <div className="hero-band__text">
          <span className="eyebrow">欢迎回来，{admin.displayName}</span>
          <h2>管理控制台</h2>
          <p>查看平台访问与 AI 辅导概况，管理物理实验内容与知识库。</p>
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
            新建实验
          </Link>
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
              <span className="stat-card__delta">
                {summaryError ? "加载失败" : summary ? "实时数据" : "加载中…"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">访客趋势</span>
            <span className="pill-tag pill-tag--shade">近 {days} 日</span>
          </div>
          {analyticsError ? (
            <p className="caption">加载失败</p>
          ) : analytics ? (
            <TrendChart data={analytics.visitTrend} color="#5f8f7a" />
          ) : (
            <p className="caption">加载中…</p>
          )}
        </div>

        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">注册趋势</span>
            <span className="pill-tag pill-tag--shade">近 {days} 日</span>
          </div>
          {analyticsError ? (
            <p className="caption">加载失败</p>
          ) : analytics ? (
            <TrendChart data={analytics.registerTrend} color="#99b3ad" />
          ) : (
            <p className="caption">加载中…</p>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">实验收藏 Top</span>
            <Link href="/favorites" className="pill-tag pill-tag--mint">
              查看全部
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
                      <span style={{ width: `${(item.favoriteCount / maxFavorite) * 100}%` }} />
                    </div>
                  </div>
                  <span className="rank-row__count">{item.favoriteCount}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">AI 辅导</span>
            <Link href="/ai-chat" className="pill-tag pill-tag--mint">
              试聊
            </Link>
          </div>
          {!analytics ? (
            <p className="caption">{analyticsError ? "加载失败" : "加载中…"}</p>
          ) : (
            <>
              <div className="ai-kpi-grid">
                <div className="ai-kpi">
                  <strong>{analytics.ai.sessionCount}</strong>
                  <span>会话</span>
                </div>
                <div className="ai-kpi">
                  <strong>{analytics.ai.questionCount}</strong>
                  <span>提问</span>
                </div>
                <div className="ai-kpi">
                  <strong>{analytics.ai.avgSessionDepth}</strong>
                  <span>会话深度</span>
                </div>
                <div className="ai-kpi">
                  <strong>{formatRate(analytics.ai.ragHitRate)}</strong>
                  <span>知识库命中</span>
                </div>
              </div>
              <TrendChart data={analytics.ai.questionTrend} color="#3f3f46" height={140} />
            </>
          )}
        </div>
      </section>

      <section className="section-grid">
        <div className="card card--elevated section-card">
          <div className="section-card__head">
            <span className="heading-sm">快捷入口</span>
          </div>
          <div className="placeholder-list">
            {[
              { title: "实验管理", href: "/experiments" },
              { title: "用户列表", href: "/users" },
              { title: "知识库", href: "/knowledge" },
              { title: "公告管理", href: "/announcements" },
            ].map((item) => (
              <div key={item.title} className="placeholder-row">
                <span className="placeholder-row__dot" style={{ background: "var(--aloe-10)" }} />
                <Link href={item.href} className="quick-link">
                  {item.title}
                </Link>
                <span className="pill-tag pill-tag--mint">→</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
