"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  addFavorite,
  API_BASE,
  experimentCoverSrc,
  experimentSubjectLabel,
  fetchExperiments,
  fetchMe,
  removeFavorite,
  type Experiment,
  type UserProfile,
} from "@/lib/api";
import { avatarInitials, avatarSrc, isAuthenticated } from "@/lib/auth";
import { ArrowRight, Eye, Search, Star } from "lucide-react";
import AnnouncementMenu from "@/components/AnnouncementMenu";
import FavoritesRankCarousel from "@/components/FavoritesRankCarousel";
import { BrandLockup } from "@/components/BrandLogo";
import ExperimentThumbnail from "@/components/ExperimentThumbnail";

const PAGE = "page-shell";

/** 学科取色：沿用设计稿的「彩色分级徽章」思路，色相按物理分支区分。 */
const SUBJECT_TONE: Record<string, { fg: string; bg: string; bd: string }> = {
  QUANTUM: { fg: "#c4b5fd", bg: "rgba(46,16,101,.6)", bd: "rgba(139,92,246,.3)" },
  RELATIVITY: { fg: "#fcd34d", bg: "rgba(69,26,3,.55)", bd: "rgba(245,158,11,.3)" },
  WAVE: { fg: "#6ee7b7", bg: "rgba(4,47,46,.55)", bd: "rgba(16,185,129,.3)" },
  ACOUSTICS: { fg: "#93c5fd", bg: "rgba(30,58,138,.45)", bd: "rgba(59,130,246,.3)" },
  OPTICS: { fg: "#67e8f9", bg: "rgba(8,51,68,.6)", bd: "rgba(6,182,212,.3)" },
  FLUID_MECHANICS: { fg: "#7dd3fc", bg: "rgba(12,74,110,.5)", bd: "rgba(14,165,233,.3)" },
  ELECTRICITY: { fg: "#a5b4fc", bg: "rgba(49,46,129,.45)", bd: "rgba(99,102,241,.3)" },
  MECHANICS: { fg: "#cbd5e1", bg: "rgba(51,65,85,.45)", bd: "rgba(148,163,184,.28)" },
};

const FALLBACK_TONE = SUBJECT_TONE.MECHANICS;

function subjectStyle(exp: Experiment) {
  const tone = SUBJECT_TONE[exp.subjectType] ?? FALLBACK_TONE;
  return {
    ["--kh-subject-fg" as string]: tone.fg,
    ["--kh-subject-bg" as string]: tone.bg,
    ["--kh-subject-bd" as string]: tone.bd,
  };
}

function SubjectBadge({ exp }: { exp: Experiment }) {
  return (
    <span className="kh-subject" style={subjectStyle(exp)}>
      {experimentSubjectLabel(exp)}
    </span>
  );
}

/** 页眉右侧：头像 + 昵称（未登录显示「登录」） */
function HeaderUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      setReady(true);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <span className="kh-header__user-skeleton" aria-hidden />;

  if (!user) {
    return (
      <a href="/login" className="kh-header__link">
        登录
      </a>
    );
  }

  const src = avatarSrc(user.avatarUrl, API_BASE);
  return (
    <a href="/profile" className="kh-header__user" data-tooltip="个人中心">
      <span className="kh-avatar">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" />
        ) : (
          <span className="kh-avatar__text">{avatarInitials(user.nickname || user.username)}</span>
        )}
        <span className="kh-avatar__online" aria-hidden />
      </span>
      <span className="kh-header__nickname">{user.nickname || user.username}</span>
    </a>
  );
}

function BrandMark() {
  return <BrandLockup href="/" size={30} spin showTagline={false} />;
}

function ExperimentCard({
  exp,
  index = 0,
  onToggleFavorite,
}: {
  exp: Experiment;
  index?: number;
  onToggleFavorite: (exp: Experiment) => void;
}) {
  const fav = !!exp.favorited;
  const cover = experimentCoverSrc(exp.coverUrl);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(exp);
  };

  return (
    <a
      href={`/experiments/${exp.route}`}
      className="kh-card kh-enter group"
      style={{ ["--kh-delay" as string]: `${Math.min(index, 8) * 60}ms` }}
    >
      <div className="kh-card__top">
        {/* 预览窗：卡片内嵌的一小块视口 */}
        <div className="kh-card__preview">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              unoptimized={cover.startsWith("http")}
            />
          ) : (
            <ExperimentThumbnail route={exp.route} className="kh-card__thumb" />
          )}

          <button
            type="button"
            onClick={handleFavorite}
            className={`kh-card__fav${fav ? " is-on" : ""}`}
            data-tooltip={fav ? "取消收藏" : "收藏"}
            aria-label={fav ? `取消收藏 ${exp.title}` : `收藏 ${exp.title}`}
            aria-pressed={fav}
          >
            <Star size={15} fill={fav ? "currentColor" : "none"} />
          </button>
        </div>

        <div className="kh-card__main">
          <SubjectBadge exp={exp} />
          <h3 className="kh-card__name">{exp.title}</h3>
          <p className="kh-card__desc">{exp.description}</p>
          {exp.topics.length > 0 && (
            <div className="kh-card__tags">
              {exp.topics.slice(0, 2).map((t) => (
                <span key={t} className="kh-card__tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="kh-card__foot">
        <div className="kh-card__metrics">
          {exp.viewCount != null && (
            <span className="kh-metric" data-tooltip="浏览量" aria-label="浏览量">
              <Eye size={13} aria-hidden />
              {exp.viewCount}
            </span>
          )}
          {exp.favoriteCount != null && (
            <span
              className={`kh-metric kh-metric--fav${fav ? " is-on" : ""}`}
              data-tooltip={fav ? "已收藏" : "收藏数"}
              aria-label={fav ? "已收藏" : "收藏数"}
            >
              <Star size={13} fill={fav ? "currentColor" : "none"} aria-hidden />
              {exp.favoriteCount}
            </span>
          )}
        </div>

        <span className="kh-launch">
          启动
          <span aria-hidden>→</span>
        </span>
      </div>
    </a>
  );
}

export default function Home() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  /** 从「查看全部收藏」跳来时，等数据加载完再滚到实验区 */
  const scrollToExperimentsRef = useRef(false);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadExperiments = useCallback(async (q?: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchExperiments(q);
      setExperiments(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("subject");
    if (code) setSubjectFilter(code);
    // 个人中心「查看全部收藏」入口：开启「仅看收藏」，数据就绪后滚到实验区
    if (params.get("fav") === "1" && isAuthenticated()) {
      setShowFavoritesOnly(true);
      scrollToExperimentsRef.current = true;
    }
  }, []);

  // 实验数据首屏加载完成后（布局高度稳定）再定位，避免滚到半空
  useEffect(() => {
    if (loading || !scrollToExperimentsRef.current) return;
    scrollToExperimentsRef.current = false;
    document.getElementById("experiments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        loadExperiments(search || undefined);
      },
      search ? 300 : 0,
    );
    return () => clearTimeout(timer);
  }, [search, loadExperiments]);

  // ⌘K / Ctrl+K 聚焦搜索
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** 真实学科分布（用学科 code 归并，避免同一学科多种展示名）。 */
  const subjectFacets = useMemo(() => {
    const map = new Map<string, { code: string; label: string; count: number }>();
    for (const exp of experiments) {
      const code = exp.subjectType ?? "UNKNOWN";
      const existing = map.get(code);
      if (existing) existing.count += 1;
      else map.set(code, { code, label: experimentSubjectLabel(exp), count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  }, [experiments]);

  const favoritesCount = useMemo(
    () => experiments.filter((exp) => exp.favorited).length,
    [experiments],
  );

  const filtered = useMemo(() => {
    let list = experiments;
    if (subjectFilter) list = list.filter((exp) => exp.subjectType === subjectFilter);
    if (showFavoritesOnly) list = list.filter((exp) => exp.favorited);
    return list;
  }, [experiments, subjectFilter, showFavoritesOnly]);

  const promptLogin = () => {
    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  const handleToggleFavorite = async (exp: Experiment) => {
    if (!isAuthenticated()) {
      promptLogin();
      return;
    }

    const wasFavorited = !!exp.favorited;
    setExperiments((list) =>
      list.map((item) =>
        item.id === exp.id
          ? {
              ...item,
              favorited: !wasFavorited,
              favoriteCount: Math.max(0, (item.favoriteCount ?? 0) + (wasFavorited ? -1 : 1)),
            }
          : item,
      ),
    );

    try {
      if (wasFavorited) {
        await removeFavorite(exp.id);
      } else {
        await addFavorite(exp.id);
      }
    } catch {
      setExperiments((list) =>
        list.map((item) =>
          item.id === exp.id
            ? {
                ...item,
                favorited: wasFavorited,
                favoriteCount: Math.max(0, (item.favoriteCount ?? 0) + (wasFavorited ? 1 : -1)),
              }
            : item,
        ),
      );
    }
  };

  const handleFavoritesFilter = () => {
    if (!isAuthenticated()) {
      promptLogin();
      return;
    }
    setShowFavoritesOnly((v) => !v);
  };

  const selectSubject = (code: string | null) => {
    setSubjectFilter(code);
    setShowFavoritesOnly(false);
  };

  const nothingToShow = !loading && !error && filtered.length === 0;

  return (
    <main className="min-h-screen w-full" style={{ background: "var(--sx-void)" }}>
      <header className="kh-header">
        <div className={`${PAGE} kh-header__inner`}>
          <BrandMark />

          <div className="kh-header__right">
            <AnnouncementMenu />
            <span className="kh-header__divider" aria-hidden />
            <HeaderUser />
          </div>
        </div>
      </header>

      <div className={`${PAGE} py-6 sm:py-8 space-y-6 sm:space-y-8`}>
        <section className="kh-hero">
          <span className="kh-hero__glow kh-hero__glow--a" aria-hidden />
          <span className="kh-hero__glow kh-hero__glow--b" aria-hidden />

          <div className="kh-hero__grid">
            <div className="flex flex-col gap-5">
              <span className="kh-badge w-fit kh-enter" style={{ ["--kh-delay" as string]: "0ms" }}>
                <span className="kh-badge__dot kh-ping" aria-hidden />
                交互式 3D 物理仿真平台
              </span>

              <h1 className="kh-hero__title kh-enter" style={{ ["--kh-delay" as string]: "80ms" }}>
                用 3D
                <br />
                <span className="kh-hero__accent">做物理实验</span>
              </h1>

              <p className="kh-hero__lead kh-enter" style={{ ["--kh-delay" as string]: "160ms" }}>
                控制变量、观察模拟、实时读数。交互式物理实验，在浏览器中高速稳定运行。
              </p>

              <div
                className="flex flex-wrap items-center gap-3 kh-enter"
                style={{ ["--kh-delay" as string]: "240ms" }}
              >
                <a href="#experiments" className="btn-primary kh-press">
                  开始探索
                  <ArrowRight size={16} />
                </a>
              </div>

              <div className="kh-hero__stat kh-enter" style={{ ["--kh-delay" as string]: "320ms" }}>
                {experiments.length > 0 ? (
                  <>
                    <span className="kh-stat">
                      <b className="kh-stat__n">{experiments.length}</b> 实验
                    </span>
                    <span className="kh-stat__sep" aria-hidden>
                      ·
                    </span>
                    <span className="kh-stat">
                      <b className="kh-stat__n kh-stat__n--alt">{subjectFacets.length}</b> 学科
                    </span>
                    <span className="kh-stat__sep" aria-hidden>
                      ·
                    </span>
                    <span className="kh-stat__plain">WebGL 3D 交互</span>
                  </>
                ) : (
                  <span className="kh-stat__plain">3D 交互物理实验</span>
                )}
              </div>
            </div>

            {!loading && experiments.length > 0 && (
              <div className="kh-enter" style={{ ["--kh-delay" as string]: "140ms" }}>
                <FavoritesRankCarousel experiments={experiments} />
              </div>
            )}
          </div>
        </section>

        <section id="experiments" className="kh-dashboard">
          <div className="kh-dashboard__head">
            <h2 className="kh-dashboard__title">
              探索实验
              <span className="kh-count-pill">
                共 {experiments.length} 个 · 完整在线
              </span>
            </h2>

            <div className="kh-search">
              <span className="kh-search__icon" aria-hidden>
                <Search size={16} />
              </span>
              <input
                ref={searchRef}
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索实验名…"
                aria-label="搜索实验名"
              />
            </div>
          </div>

          <div className="kh-filterbar">
            <div className="kh-filterbar__chips">
              <button
                type="button"
                className={`kh-tab${subjectFilter === null && !showFavoritesOnly ? " is-active" : ""}`}
                onClick={() => selectSubject(null)}
              >
                全部 ({experiments.length})
              </button>

              {subjectFacets.map((s) => (
                <button
                  key={s.code}
                  type="button"
                  className={`kh-tab${subjectFilter === s.code ? " is-active" : ""}`}
                  onClick={() => selectSubject(s.code)}
                >
                  {s.label} ({s.count})
                </button>
              ))}
            </div>

            <button
              type="button"
              className={`kh-fav-filter${showFavoritesOnly ? " is-active" : ""}`}
              onClick={handleFavoritesFilter}
              aria-pressed={showFavoritesOnly}
            >
              <Star size={15} fill={showFavoritesOnly ? "currentColor" : "none"} aria-hidden />
              仅看已收藏
              {favoritesCount > 0 ? ` (${favoritesCount})` : ""}
            </button>
          </div>

          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="kh-skeleton" style={{ height: 340 }} />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="text-center py-16 sx-eyebrow text-[#5b6070]">{error}</p>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
              {filtered.map((exp, i) => (
                <ExperimentCard
                  key={exp.id}
                  exp={exp}
                  index={i}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}

          {nothingToShow && (
            <p className="text-center py-16 sx-eyebrow text-[#5b6070]">
              {showFavoritesOnly ? "暂无收藏" : search ? "无匹配结果" : "该学科暂无实验"}
            </p>
          )}
        </section>
      </div>

      <footer className="site-foot">
        <div className={`${PAGE} site-foot__in`}>
          PhysLab 3D — 交互式 3D 物理仿真平台
        </div>
      </footer>
    </main>
  );
}
