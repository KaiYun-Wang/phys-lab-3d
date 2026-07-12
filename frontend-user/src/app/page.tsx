"use client";

import { useState, useMemo, useEffect } from "react";
import { experiments } from "@/data/experiments";
import { Star, ArrowRight, Search } from "lucide-react";

const DIFFICULTY_LABELS: Record<string, string> = {
  Beginner: "入门",
  Intermediate: "进阶",
  Advanced: "高级",
};

function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("favorites") || "[]");
  } catch {
    return [];
  }
}

function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}

const PAGE = "page-shell";

function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/85 backdrop-blur-md border-b border-[#45454f]">
      <div className={`${PAGE} h-14 flex items-center justify-between`}>
        <a href="/" className="sx-eyebrow text-white hover:opacity-80 transition-opacity">
          PhysLab 3D
        </a>
        <a href="/profile" className="sx-eyebrow text-white hover:opacity-80 transition-opacity">
          个人中心
        </a>
      </div>
    </header>
  );
}

function ExperimentCard({
  exp,
  onToggleFavorite,
}: {
  exp: (typeof experiments)[0];
  onToggleFavorite: (id: string) => void;
}) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFavorite(exp.id));
  }, [exp.id]);

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(exp.id);
    setFav((f) => !f);
  };

  return (
    <a href={`/experiments/${exp.id}`} className="sx-card group flex flex-col h-full">
      <div className="flex items-start justify-between mb-5">
        <div className="sx-icon-well">{exp.icon}</div>
        <button
          onClick={handleFavorite}
          className={`p-2 rounded-full border border-transparent hover:border-[#45454f] hover:bg-white/5 transition-colors ${fav ? "text-white" : "text-[#8a8a96] hover:text-white"}`}
          title={fav ? "取消收藏" : "收藏"}
        >
          <Star size={14} fill={fav ? "currentColor" : "none"} />
        </button>
      </div>

      <span className="inline-flex self-start text-[10px] font-bold uppercase tracking-wider text-[#8a8a96] bg-black/30 border border-[#45454f] rounded-full px-2.5 py-0.5 mb-3">
        {DIFFICULTY_LABELS[exp.difficulty] || exp.difficulty}
      </span>

      <h3 className="text-base font-bold uppercase tracking-wide text-white mb-3 leading-snug">
        {exp.title}
      </h3>

      <p className="text-sm text-[#e8e8f0]/75 leading-relaxed line-clamp-2 flex-1 min-h-[2.75rem]">
        {exp.description}
      </p>

      <div className="flex flex-wrap gap-2 mt-4 mb-4">
        {exp.topics.slice(0, 2).map((t) => (
          <span key={t} className="sx-tag">{t}</span>
        ))}
      </div>

      <div className="sx-card-footer flex items-center justify-end text-[11px] font-bold uppercase tracking-[1.1px] text-white group-hover:text-[#e8e8f0]">
        启动
        <ArrowRight size={12} className="ml-2 group-hover:translate-x-1 transition-transform" />
      </div>
    </a>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState(0);

  const preview = experiments[1] ?? experiments[0];

  useEffect(() => {
    setFavoritesCount(getFavorites().length);
  }, []);

  const filtered = useMemo(() => {
    let result = experiments.filter((exp) => {
      const matchDifficulty = !selectedDifficulty || exp.difficulty === selectedDifficulty;
      const q = search.toLowerCase();
      const matchSearch =
        q === "" ||
        exp.title.toLowerCase().includes(q) ||
        exp.description.toLowerCase().includes(q) ||
        exp.topics.some((t) => t.toLowerCase().includes(q));
      return matchDifficulty && matchSearch;
    });

    if (showFavoritesOnly) {
      result = result.filter((exp) => getFavorites().includes(exp.id));
    }

    return result;
  }, [search, selectedDifficulty, showFavoritesOnly]);

  const handleToggleFavorite = (id: string) => {
    const favorites = getFavorites();
    if (favorites.includes(id)) {
      localStorage.setItem("favorites", JSON.stringify(favorites.filter((f) => f !== id)));
    } else {
      localStorage.setItem("favorites", JSON.stringify([...favorites, id]));
    }
    setFavoritesCount(getFavorites().length);
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
              控制变量、观察模拟、实时读数。六个交互式物理实验，在浏览器中运行。
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="#experiments" className="btn-ghost">
                开始探索
              </a>
              <a href={`/experiments/${preview.id}`} className="btn-ghost opacity-70 hover:opacity-100">
                试玩
              </a>
            </div>
            <p className="sx-eyebrow text-[#5a5a5f] mt-8">
              6 实验 · 1 学科 · 3D 交互
            </p>
          </div>

          <div className="sx-preview">
            <div className="sx-preview-bar">
              <p className="sx-eyebrow text-[#8a8a96]">{preview.title}</p>
            </div>
            <div
              className="aspect-[4/3] relative flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 80%, #1a1a22 0%, #0a0a0a 50%, #000 100%)",
              }}
            >
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                }}
                aria-hidden
              />
              <div className="relative text-center">
                <span className="text-5xl block mb-3">{preview.icon}</span>
                <p className="sx-eyebrow">3D 模拟预览</p>
              </div>
            </div>
          </div>
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
              onClick={() => setShowFavoritesOnly((v) => !v)}
              className={`sx-chip ${showFavoritesOnly ? "sx-chip-active" : ""}`}
            >
              收藏{favoritesCount > 0 ? ` ${favoritesCount}` : ""}
            </button>
            <span className="w-px h-5 bg-[#45454f] self-center mx-1 hidden sm:block" />
            {[
              { key: "Beginner", label: "入门" },
              { key: "Intermediate", label: "进阶" },
              { key: "Advanced", label: "高级" },
            ].map((diff) => (
              <button
                key={diff.key}
                onClick={() =>
                  setSelectedDifficulty(selectedDifficulty === diff.key ? null : diff.key)
                }
                className={`sx-chip ${selectedDifficulty === diff.key ? "sx-chip-active" : ""}`}
              >
                {diff.label}
              </button>
            ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 items-stretch">
            {filtered.map((exp) => (
              <ExperimentCard key={exp.id} exp={exp} onToggleFavorite={handleToggleFavorite} />
            ))}
          </div>

          {filtered.length === 0 && (
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
