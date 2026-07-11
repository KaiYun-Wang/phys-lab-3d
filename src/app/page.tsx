"use client";

import { useState, useMemo, useEffect } from "react";
import { experiments } from "@/data/experiments";
import { AnimatePresence, motion } from "framer-motion";
import {
  Star, Moon, Sun,
  ChevronDown, ArrowRight,
} from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  physics: "物理",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  Beginner: "入门",
  Intermediate: "进阶",
  Advanced: "高级",
};

// Favorites utilities
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

// ========== NAVBAR ==========
function Navbar({ theme, toggleTheme }: { theme: string; toggleTheme: () => void }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-white/10 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <a
          href="/"
          className="text-lg font-bold bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent"
        >
          ScienceLab 3D
        </a>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 glass rounded-full hover:scale-105 transition-transform"
            title={theme === "dark" ? "切换至浅色模式" : "切换至深色模式"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

// ========== HERO SECTION ==========
function HeroSection() {
  return (
    <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(79,143,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(79,143,255,0.3) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-20 left-[10%] w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-[10%] w-72 h-72 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute top-40 right-[30%] w-48 h-48 bg-cyan-500/10 rounded-full blur-[80px] animate-pulse" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10"
      >
        <div className="text-xs sm:text-sm font-medium text-blue-300/70 mb-4 tracking-[0.3em] uppercase">
          交互式3D科学平台
        </div>
        <h1
          className="text-5xl md:text-7xl font-black mb-6 bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent leading-tight"
          style={{ filter: "drop-shadow(0 0 30px rgba(139,92,246,0.3))" }}
        >
          ScienceLab 3D
        </h1>
        <p className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
          探索6个交互式物理实验。控制变量、观察模拟，以前所未有的方式学习物理。
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="#experiments"
            className="px-8 py-3.5 bg-linear-to-r from-blue-600 to-purple-600 rounded-full font-semibold hover:scale-105 transition-transform animate-pulse-glow"
          >
            开始探索
          </a>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative z-10 mt-16 flex gap-8 md:gap-16 flex-wrap justify-center"
      >
        {[
          { num: "6", label: "实验" },
          { num: "1", label: "学科" },
          { num: "3D", label: "交互" },
          { num: "∞", label: "学习" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-3xl font-bold bg-linear-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {s.num}
            </div>
            <div className="text-sm text-gray-500">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 z-10"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        <ChevronDown className="text-gray-500" size={24} />
      </motion.div>
    </section>
  );
}

// ========== EXPERIMENT CARD ==========
function ExperimentCard({ exp, index, onToggleFavorite }: {
  exp: (typeof experiments)[0];
  index: number;
  onToggleFavorite: (id: string) => void;
}) {
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFavorite(exp.id));
  }, [exp.id]);

  const handleClickFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(exp.id);
    setFav((f) => !f);
  };

  return (
    <motion.a
      href={`/experiments/${exp.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.6) }}
      className="group glass rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 cursor-pointer block relative"
      style={{
        borderColor: `${exp.color}15`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${exp.color}15`;
        (e.currentTarget as HTMLElement).style.borderColor = `${exp.color}30`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
        (e.currentTarget as HTMLElement).style.borderColor = `${exp.color}15`;
      }}
    >
      {/* Category color accent bar */}
      <div
        className="absolute top-0 left-4 right-4 h-[3px] rounded-b-full"
        style={{ background: `linear-gradient(90deg, ${exp.color}, ${exp.color}66)` }}
      />

      <button
        onClick={handleClickFavorite}
        className={`absolute top-4 right-4 p-2 rounded-lg transition-all ${
          fav ? "text-yellow-400 bg-yellow-400/10" : "text-gray-500 hover:text-yellow-400"
        }`}
        title={fav ? "取消收藏" : "添加收藏"}
      >
        <Star size={16} fill={fav ? "currentColor" : "none"} />
      </button>

      <div className="flex items-start justify-between mb-4 pr-8">
        <span className="text-4xl">{exp.icon}</span>
        <span
          className="text-xs font-mono px-2 py-1 rounded-full"
          style={{
            background: `${exp.color}15`,
            color: exp.color,
          }}
        >
          {DIFFICULTY_LABELS[exp.difficulty] || exp.difficulty}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-2 group-hover:text-white transition-colors">
        {exp.title}
      </h3>
      <p className="text-sm text-gray-400 mb-4 line-clamp-2">{exp.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {exp.topics.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500"
          >
            {t}
          </span>
        ))}
        {exp.topics.length > 3 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500">
            +{exp.topics.length - 3}
          </span>
        )}
      </div>

      {/* Launch indicator on hover */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-xs font-medium capitalize" style={{ color: exp.color }}>
          {CATEGORY_LABELS[exp.category] || exp.category}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          启动 <ArrowRight size={12} />
        </span>
      </div>
    </motion.a>
  );
}

// ========== HOME PAGE ==========
export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.classList.toggle("light", savedTheme === "light");
      }
      setFavoritesCount(getFavorites().length);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("light", newTheme === "light");
  };

  const filtered = useMemo(() => {
    let result = experiments.filter((exp) => {
      const matchCat =
        activeCategory === "all" || exp.category === activeCategory;
      const matchDifficulty =
        !selectedDifficulty || exp.difficulty === selectedDifficulty;
      const matchSearch =
        search === "" ||
        exp.title.toLowerCase().includes(search.toLowerCase()) ||
        exp.description.toLowerCase().includes(search.toLowerCase()) ||
        exp.topics.some((t) =>
          t.toLowerCase().includes(search.toLowerCase())
        );
      return matchCat && matchDifficulty && matchSearch;
    });

    if (showFavoritesOnly) {
      const favorites = getFavorites();
      result = result.filter((exp) => favorites.includes(exp.id));
    }

    return result;
  }, [activeCategory, search, selectedDifficulty, showFavoritesOnly]);

  const handleToggleFavorite = (id: string) => {
    const favorites = getFavorites();
    if (favorites.includes(id)) {
      localStorage.setItem("favorites", JSON.stringify(favorites.filter((f) => f !== id)));
    } else {
      localStorage.setItem("favorites", JSON.stringify([...favorites, id]));
    }
    setFavoritesCount(getFavorites().length);
    setShowFavoritesOnly((prev) => prev);
  };

  return (
    <main>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <HeroSection />

      {/* Experiments Section */}
      <section id="experiments" className="max-w-7xl mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center relative inline-block w-full">
            探索实验
            <span className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
          </h2>


          {/* Category filters */}
          <div className="flex gap-3 justify-start md:justify-center overflow-x-auto pb-2 px-4 -mx-4 md:mx-0 md:px-0 scrollbar-hide">
            <button
              onClick={() => {
                setActiveCategory("all");
                setShowFavoritesOnly(false);
                setSelectedDifficulty(null);
              }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 whitespace-nowrap ${
                activeCategory === "all" && !showFavoritesOnly
                  ? "bg-linear-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-purple-500/20 scale-105"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              <span className="text-xl">🔬</span>
              全部实验
              {activeCategory === "all" && !showFavoritesOnly && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                />
              )}
            </button>

            {/* Favorites filter */}
            <button
              onClick={() => {
                setActiveCategory("all");
                setShowFavoritesOnly((prev) => !prev);
              }}
              className={`relative flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 whitespace-nowrap ${
                showFavoritesOnly
                  ? "bg-linear-to-r from-yellow-600/20 to-orange-600/20 text-white shadow-lg shadow-yellow-500/20 scale-105"
                  : "glass text-gray-400 hover:text-white"
              }`}
            >
              <span className="text-xl">⭐</span>
              收藏
              {favoritesCount > 0 && (
                <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                  {favoritesCount}
                </span>
              )}
              {showFavoritesOnly && (
                <motion.div
                  layoutId="activeCategory"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                />
              )}
            </button>
          </div>

          {/* Difficulty filters */}
          <div className="flex gap-2 justify-center flex-wrap mb-8">
            {[
              { key: "Beginner", label: "入门" },
              { key: "Intermediate", label: "进阶" },
              { key: "Advanced", label: "高级" },
            ].map((diff) => (
              <button
                key={diff.key}
                onClick={() => setSelectedDifficulty(selectedDifficulty === diff.key ? null : diff.key)}
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  selectedDifficulty === diff.key
                    ? "bg-linear-to-r from-blue-600/20 to-purple-600/20 text-white shadow-lg shadow-purple-500/20 scale-105"
                    : "glass text-gray-400 hover:text-white"
                }`}
              >
                {diff.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Experiment Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory + search + selectedDifficulty + showFavoritesOnly}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {filtered.map((exp, i) => (
              <ExperimentCard
                key={exp.id}
                exp={exp}
                index={i}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            {showFavoritesOnly
              ? "还没有收藏。点击任意实验上的星标图标即可添加！"
              : "未找到实验。请尝试其他搜索条件或分类。"}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 pt-12 pb-8 text-center text-gray-500 text-sm">
        <div className="h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent mb-12" />
        <div className="max-w-5xl mx-auto px-4">
          <div className="mb-10 text-center">
            <h3 className="text-lg font-bold bg-linear-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-3">
              ScienceLab 3D
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              免费的交互式3D物理实验平台。
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
