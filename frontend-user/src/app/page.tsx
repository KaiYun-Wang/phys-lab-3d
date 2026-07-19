"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  addFavorite,
  experimentCoverSrc,
  experimentSubjectLabel,
  fetchExperiments,
  removeFavorite,
  type Experiment,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { Star, ArrowRight, Search, Eye } from "lucide-react";
import AnnouncementMenu from "@/components/AnnouncementMenu";
import FavoritesRankCarousel from "@/components/FavoritesRankCarousel";

const PAGE = "page-shell";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/85 backdrop-blur-md border-b border-[#45454f]">
      <div className={`${PAGE} h-14 flex items-center justify-between`}>
        <a href="/" className="sx-eyebrow text-white hover:opacity-80 transition-opacity">
          PhysLab 3D
        </a>
        <div className="flex items-center gap-6">
          <AnnouncementMenu />
          <a href="/profile" className="sx-eyebrow text-white hover:opacity-80 transition-opacity">
            个人中心
          </a>
        </div>
      </div>
    </header>
  );
}

function ExperimentCard({
  exp,
  onToggleFavorite,
}: {
  exp: Experiment;
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
    <a href={`/experiments/${exp.route}`} className="sx-card sx-card--media group flex flex-col">
      <div className="sx-card-cover">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized={cover.startsWith("http")}
          />
        ) : (
          <div className="sx-card-cover-fallback" aria-hidden>
            <span>{exp.title}</span>
          </div>
        )}
        <button
          onClick={handleFavorite}
          className={`sx-card-fav ${fav ? "is-active" : ""}`}
          title={fav ? "取消收藏" : "收藏"}
        >
          <Star size={14} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="sx-card-body flex flex-col">
        <p className="sx-eyebrow text-[#8a8a96] mb-1">{experimentSubjectLabel(exp)}</p>
        <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide text-white mb-2 leading-snug">
          {exp.title}
        </h3>

        <p className="text-xs sm:text-sm text-[#e8e8f0]/75 leading-relaxed line-clamp-2">
          {exp.description}
        </p>

        <div className="flex flex-wrap gap-2 mt-3 mb-2">
          {exp.topics.slice(0, 2).map((t) => (
            <span key={t} className="sx-tag">{t}</span>
          ))}
        </div>

        {(exp.viewCount != null || exp.favoriteCount != null) && (
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.08em] text-[#5a5a5f] mb-1">
            {exp.viewCount != null && (
              <span className="inline-flex items-center gap-1">
                <Eye size={11} />
                {exp.viewCount}
              </span>
            )}
            {exp.favoriteCount != null && (
              <span className="inline-flex items-center gap-1">
                <Star size={11} />
                {exp.favoriteCount}
              </span>
            )}
          </div>
        )}

        <div className="sx-card-footer flex items-center justify-end text-[11px] font-bold uppercase tracking-[1.1px] text-white group-hover:text-[#e8e8f0]">
          启动
          <ArrowRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </a>
  );
}

export default function Home() {
  const router = useRouter();
  const [search, setSearch] = useState("");
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
    const timer = setTimeout(() => {
      loadExperiments(search || undefined);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, loadExperiments]);

  const favoritesCount = useMemo(
    () => experiments.filter((exp) => exp.favorited).length,
    [experiments],
  );

  const filtered = useMemo(() => {
    if (!showFavoritesOnly) return experiments;
    return experiments.filter((exp) => exp.favorited);
  }, [experiments, showFavoritesOnly]);

  const topFavorite = useMemo(() => {
    if (experiments.length === 0) return null;
    return [...experiments].sort(
      (a, b) => (b.favoriteCount ?? 0) - (a.favoriteCount ?? 0),
    )[0];
  }, [experiments]);

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

  return (
    <main className="min-h-screen w-full bg-black">
      <Navbar />

      <div className={`${PAGE} py-6 sm:py-8 space-y-6 sm:space-y-8`}>
        <section className="sx-section grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <p className="sx-eyebrow mb-6">交互式 3D 物理仿真平台</p>
            <h1 className="sx-display text-[clamp(1.75rem,4vw,3rem)] mb-6">
              用 3D
              <br />
              做物理实验
            </h1>
            <p className="text-base text-[#f0f0fa]/80 leading-relaxed mb-8 max-w-md">
              控制变量、观察模拟、实时读数。交互式物理实验，在浏览器中运行。
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#experiments" className="btn-ghost">
                开始探索
              </a>
              {topFavorite && (
                <a
                  href={`/experiments/${topFavorite.route}`}
                  className="btn-ghost opacity-70 hover:opacity-100"
                >
                  试玩
                </a>
              )}
            </div>
            <p className="sx-eyebrow text-[#5a5a5f] mt-8">
              {experiments.length > 0
                ? `${experiments.length} 实验 · 1 学科 · 3D 交互`
                : "3D 交互物理实验"}
            </p>
          </div>

          {!loading && experiments.length > 0 && (
            <FavoritesRankCarousel experiments={experiments} />
          )}
        </section>

        <section id="experiments" className="sx-section">
          <div className="sx-toolbar mb-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="sx-display text-xl sm:text-2xl mb-1">探索实验</h2>
                <p className="sx-eyebrow text-[#8a8a96]">
                  共 {experiments.length} 个 · 显示 {filtered.length} 个
                </p>
              </div>
              <div className="sx-search w-full lg:w-72 shrink-0">
                <Search size={14} className="text-[#8a8a96] shrink-0" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索实验…"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#45454f]">
              <button
                onClick={() => setShowFavoritesOnly(false)}
                className={`sx-chip ${!showFavoritesOnly ? "sx-chip-active" : ""}`}
              >
                全部
              </button>
              <button
                onClick={handleFavoritesFilter}
                className={`sx-chip ${showFavoritesOnly ? "sx-chip-active" : ""}`}
              >
                收藏{favoritesCount > 0 ? ` ${favoritesCount}` : ""}
              </button>
            </div>
          </div>

          {loading && (
            <p className="text-center py-16 sx-eyebrow text-[#5a5a5f]">加载中…</p>
          )}

          {!loading && error && (
            <p className="text-center py-16 sx-eyebrow text-[#5a5a5f]">{error}</p>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 items-start">
              {filtered.map((exp) => (
                <ExperimentCard key={exp.id} exp={exp} onToggleFavorite={handleToggleFavorite} />
              ))}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <p className="text-center py-16 sx-eyebrow text-[#5a5a5f]">
              {showFavoritesOnly ? "暂无收藏" : "无匹配结果"}
            </p>
          )}
        </section>
      </div>

      <footer className="w-full border-t border-[#45454f] mt-2">
        <div className={`${PAGE} py-10 sx-eyebrow text-[#5a5a5f]`}>
          PhysLab 3D — 交互式 3D 物理仿真平台
        </div>
      </footer>
    </main>
  );
}
