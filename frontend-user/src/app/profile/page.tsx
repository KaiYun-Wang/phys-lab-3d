"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  changePassword,
  experimentCoverSrc,
  experimentSubjectLabel,
  fetchAllAiSessions,
  fetchFavorites,
  fetchMe,
  fetchUserStats,
  resetAvatar,
  updateProfile,
  uploadAvatar,
  type AiChatSession,
  type Experiment,
  type UserProfile,
  type UserStats,
} from "@/lib/api";
import { avatarInitials, avatarSrc, clearToken } from "@/lib/auth";
import { BrandLockup } from "@/components/BrandLogo";
import AnimatedNumber from "@/components/AnimatedNumber";
import { formatChatTime } from "@/lib/time";
import ExperimentThumbnail from "@/components/ExperimentThumbnail";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Eye,
  KeyRound,
  Lock,
  LogOut,
  MessageCircle,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Star,
  Upload,
  UserRound,
  X,
} from "lucide-react";

const NICKNAME_MAX = 20;
/** 个人中心最近对话展示条数 */
const RECENT_SESSIONS = 5;
/** 收藏网格默认展示前 N 个（2×2），其余折叠 */
const FAV_COLLAPSED = 4;
/** 「全部对话」弹框每页条数（滚动加载下一页） */
const MODAL_PAGE_SIZE = 10;

/** 学科徽章配色：与首页 SUBJECT_TONE 同一套语义色 */
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
    ["--pf-subject-fg" as string]: tone.fg,
    ["--pf-subject-bg" as string]: tone.bg,
    ["--pf-subject-bd" as string]: tone.bd,
  };
}

/** 会话深链：实验会话回对应实验页，首页会话回首页，均由 ?aiSession 精准打开 */
function sessionHref(s: AiChatSession): string {
  if (s.experimentRoute) return `/experiments/${s.experimentRoute}?aiSession=${s.id}`;
  return `/?aiSession=${s.id}`;
}

function AvatarView({ user, size = "xl" }: { user: UserProfile; size?: "xl" | "form" }) {
  const src = avatarSrc(user.avatarUrl, API_BASE);
  const cls = size === "xl" ? "pf-ava pf-ava--xl" : "pf-ava pf-ava--md";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <div className={cls}>
        <img src={src} alt="头像" />
      </div>
    );
  }
  return <div className={cls}>{avatarInitials(user.nickname || user.username)}</div>;
}

/** 全部 AI 对话浮层：Surface-2 玻璃弹框，内部滚动分页加载 */
function AllSessionsModal({ total, onClose }: { total: number | null; onClose: () => void }) {
  const [rows, setRows] = useState<AiChatSession[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  // 打开时拉第一页
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetchAllAiSessions(1, MODAL_PAGE_SIZE);
        if (cancelled) return;
        const recs = res.records ?? [];
        setRows(recs);
        setExhausted(recs.length >= (res.total ?? recs.length));
      } catch {
        /* 保持空列表 */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetchAllAiSessions(next, MODAL_PAGE_SIZE);
      const recs = res.records ?? [];
      setRows((prev) => {
        const merged = [...prev, ...recs.filter((r) => !prev.some((x) => x.id === r.id))];
        if (merged.length >= (res.total ?? merged.length)) setExhausted(true);
        return merged;
      });
      setPage(next);
    } catch {
      /* 静默失败：下次滚动会重试 */
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, exhausted, page]);

  const onScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 32) void loadMore();
    },
    [loadMore],
  );

  // ESC 关闭；锁定背景滚动
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div className="pf-modal-mask" onClick={onClose}>
      <div
        className="pf-modal"
        role="dialog"
        aria-modal="true"
        aria-label="全部 AI 对话"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="pf-modal__head">
          <span className="pf-card__t">
            <MessageCircle size={13} className="pf-ic pf-ic--pur" aria-hidden />
            全部 AI 对话
            {total != null && <em className="pf-pill pf-pill--pur">{total}</em>}
          </span>
          <button type="button" className="pf-modal__close" onClick={onClose} aria-label="关闭">
            <X size={16} aria-hidden />
          </button>
        </header>
        <div className="pf-modal__body" onScroll={onScroll}>
          {loading ? (
            <p className="pf-empty">加载中…</p>
          ) : rows.length === 0 ? (
            <p className="pf-empty">还没有对话记录</p>
          ) : (
            <>
              {rows.map((s) => (
                <a key={s.id} href={sessionHref(s)} className="pf-sess">
                  <span className="pf-sess__ic">
                    <MessageCircle size={12} aria-hidden />
                  </span>
                  <span className="pf-sess__main">
                    <span className="pf-sess__t">{s.title || "新对话"}</span>
                    <span className="pf-sess__m">{s.experimentTitle ?? "通用助手"}</span>
                  </span>
                  <span className="pf-sess__time">{formatChatTime(s.updateTime)}</span>
                </a>
              ))}
              {loadingMore ? <p className="pf-modal__more">加载中…</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [favorites, setFavorites] = useState<Experiment[]>([]);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [nickname, setNickname] = useState("");
  const [allSessionsOpen, setAllSessionsOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        setUser(u);
        setNickname(u.nickname);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
    // 读数 / 收藏 / 对话：任一失败不阻塞页面
    fetchUserStats().then(setStats).catch(() => {});
    fetchFavorites().then(setFavorites).catch(() => {});
    fetchAllAiSessions(1, RECENT_SESSIONS)
      .then((p) => setSessions(p.records ?? []))
      .catch(() => {});
  }, []);

  const joinDays = useMemo(() => {
    if (!user?.createTime) return null;
    const t = new Date(user.createTime).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(1, Math.floor((Date.now() - t) / 86_400_000) + 1);
  }, [user]);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const u = await updateProfile({ nickname });
      setUser(u);
      setNickname(u.nickname);
      setMsg("昵称已更新");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setErr("");
    const form = new FormData(e.currentTarget);
    const oldPassword = String(form.get("oldPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const newPassword2 = String(form.get("newPassword2") ?? "");
    if (newPassword !== newPassword2) {
      setErr("两次新密码不一致");
      return;
    }
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      e.currentTarget.reset();
      setMsg("密码已更新");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) return;
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const u = await uploadAvatar(file);
      setUser(u);
      setMsg("头像已更新");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "上传失败");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onAvatarReset() {
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const u = await resetAvatar();
      setUser(u);
      setMsg("已恢复默认头像");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <div className="pf-page flex items-center justify-center">
        <p className="sx-eyebrow text-[#6b7280]">{err || "加载中…"}</p>
      </div>
    );
  }

  const dirty = nickname !== user.nickname;
  const visibleFavs = favorites.slice(0, FAV_COLLAPSED);

  return (
    <div className="pf-page">
      <header className="pf-nav">
        <div className="page-shell pf-nav__inner">
          <BrandLockup href="/" size={30} />
          <a href="/" className="kh-header__link">
            <ArrowLeft size={14} aria-hidden />
            返回实验
          </a>
        </div>
      </header>

      <main className="pf-wrap">
        {/* 身份横幅 */}
        <section className="pf-banner">
          <div className="pf-banner__left">
            <AvatarView user={user} />
            <div>
              <div className="pf-banner__name">
                {user.nickname}
                <span className="pf-chip-mono">{user.username}</span>
              </div>
              <div className="pf-banner__sub">
                {joinDays != null && (
                  <>
                    <span className="pf-banner__meta">
                      <CalendarDays size={12} aria-hidden />
                      <span>
                        加入第 <b className="pf-mono">{joinDays}</b> 天
                      </span>
                    </span>
                    <span className="pf-sep">·</span>
                  </>
                )}
                <span className="pf-banner__meta">
                  <ShieldCheck size={12} aria-hidden />
                  账号正常
                </span>
              </div>
            </div>
          </div>
          <button type="button" className="pf-btn pf-btn--danger" onClick={logout}>
            <LogOut size={13} aria-hidden />
            登出
          </button>
        </section>

        {/* 活动读数：四张统计卡，数字滚动增长同款渐进效果 */}
        <section className="pf-stats">
          <div className="pf-stat-card" data-tone="sky">
            <div className="pf-stat-card__head">
              <Star size={13} aria-hidden />
              <span>收藏实验数量</span>
            </div>
            <span className="pf-stat-card__value">
              <AnimatedNumber value={stats?.favoriteCount ?? null} delay={0} />
            </span>
          </div>
          <div className="pf-stat-card" data-tone="pur">
            <div className="pf-stat-card__head">
              <MessageCircle size={13} aria-hidden />
              <span>AI 对话数</span>
            </div>
            <span className="pf-stat-card__value">
              <AnimatedNumber value={stats?.sessionCount ?? null} delay={110} />
            </span>
          </div>
          <div className="pf-stat-card" data-tone="eme">
            <div className="pf-stat-card__head">
              <MessageSquare size={13} aria-hidden />
              <span>评论数</span>
            </div>
            <span className="pf-stat-card__value">
              <AnimatedNumber value={stats?.commentCount ?? null} delay={220} />
            </span>
          </div>
          <div className="pf-stat-card" data-tone="amb">
            <div className="pf-stat-card__head">
              <Eye size={13} aria-hidden />
              <span>实验运行次数</span>
            </div>
            <span className="pf-stat-card__value">
              <AnimatedNumber value={stats?.viewCount ?? null} delay={330} />
            </span>
          </div>
        </section>

        <div className="pf-grid">
          {/* 左列：内容档案 */}
          <div className="pf-col">
            <section className="pf-card">
              <header className="pf-card__head">
                <span className="pf-card__t">
                  <Star size={13} className="pf-ic pf-ic--sky" aria-hidden />
                  我的收藏
                  <em className="pf-pill">{favorites.length}</em>
                </span>
                <span className="pf-card__state">全部同步</span>
              </header>
              {favorites.length === 0 ? (
                <p className="pf-empty">还没有收藏。去实验库点卡片上的 ★ 即可收藏。</p>
              ) : (
                <div className="pf-fav-grid">
                  {visibleFavs.map((exp, i) => {
                    const cover = experimentCoverSrc(exp.coverUrl);
                    return (
                      <a
                        key={exp.id}
                        href={`/experiments/${exp.route}`}
                        className="pf-mini kh-enter"
                        style={{ ["--kh-delay" as string]: `${Math.min(i, 8) * 70}ms` }}
                      >
                        <span className="pf-mini__thumb">
                          {cover ? (
                            <Image
                              src={cover}
                              alt=""
                              fill
                              sizes="240px"
                              className="object-cover"
                              unoptimized={cover.startsWith("http")}
                            />
                          ) : (
                            <ExperimentThumbnail route={exp.route} />
                          )}
                        </span>
                        <span className="pf-mini__body">
                          <span className="pf-mini__subj" style={subjectStyle(exp)}>
                            {experimentSubjectLabel(exp)}
                          </span>
                          <span className="pf-mini__name">{exp.title}</span>
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
              {favorites.length > FAV_COLLAPSED && (
                <div className="pf-card__foot pf-card__foot--center">
                  <a className="pf-link" href="/?fav=1">
                    查看全部 {favorites.length} 个收藏
                    <ArrowRight size={11} aria-hidden />
                  </a>
                </div>
              )}
            </section>

            <section className="pf-card">
              <header className="pf-card__head">
                <span className="pf-card__t">
                  <MessageCircle size={13} className="pf-ic pf-ic--pur" aria-hidden />
                  最近 AI 对话
                  {stats && <em className="pf-pill pf-pill--pur">{stats.sessionCount}</em>}
                </span>
                <span className="pf-card__state">按最近更新</span>
              </header>
              {sessions.length === 0 ? (
                <p className="pf-empty">还没有对话记录。点右下角气泡即可开始提问。</p>
              ) : (
                <>
                  {sessions.map((s, i) => (
                    <a
                      key={s.id}
                      href={sessionHref(s)}
                      className="pf-sess kh-enter"
                      style={{ ["--kh-delay" as string]: `${Math.min(i, 8) * 55}ms` }}
                    >
                      <span className="pf-sess__ic">
                        <MessageCircle size={12} aria-hidden />
                      </span>
                      <span className="pf-sess__main">
                        <span className="pf-sess__t">{s.title || "新对话"}</span>
                        <span className="pf-sess__m">{s.experimentTitle ?? "通用助手"}</span>
                      </span>
                      <span className="pf-sess__time">{formatChatTime(s.updateTime)}</span>
                    </a>
                  ))}
                  <div className="pf-card__foot pf-card__foot--center">
                    <button
                      type="button"
                      className="pf-link"
                      onClick={() => setAllSessionsOpen(true)}
                    >
                      查看全部{stats ? ` ${stats.sessionCount} 段对话` : "对话"}
                      <ArrowRight size={11} aria-hidden />
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>

          {/* 右列：账号设置 */}
          <div className="pf-col">
            <section className="pf-card">
              <header className="pf-card__head">
                <span className="pf-card__t">
                  <UserRound size={13} className="pf-ic pf-ic--sky" aria-hidden />
                  账号资料
                </span>
                <span className="pf-card__state">{dirty ? "有未保存的更改" : "已同步"}</span>
              </header>
              <form className="pf-card__body" onSubmit={saveProfile}>
                <div className="pf-ava-row">
                  <AvatarView user={user} size="form" />
                  <div className="pf-ava-btns">
                    <button
                      type="button"
                      className="pf-btn"
                      disabled={loading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload size={12} aria-hidden />
                      上传头像
                    </button>
                    <button
                      type="button"
                      className="pf-btn pf-btn--warn"
                      disabled={loading}
                      onClick={onAvatarReset}
                    >
                      <RotateCcw size={12} aria-hidden />
                      恢复默认
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => onAvatarChange(e.target.files?.[0])}
                    />
                  </div>
                </div>
                <span className="pf-hint">支持 JPG / PNG / WebP，不超过 2MB</span>

                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="nickname">
                      昵称
                    </label>
                    <span className="pf-counter">
                      {nickname.length}/{NICKNAME_MAX}
                    </span>
                  </div>
                  <input
                    id="nickname"
                    className="sx-input"
                    maxLength={NICKNAME_MAX}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="请输入昵称"
                    required
                  />
                </div>

                <div className="pf-field">
                  <div className="pf-field__head">
                    <span className="sx-label">用户名</span>
                    <span className="sx-label">唯一标识</span>
                  </div>
                  <div className="pf-locked">
                    <span className="pf-mono">{user.username}</span>
                    <span className="pf-locked__tag">
                      <Lock size={10} aria-hidden />
                      锁定
                    </span>
                  </div>
                </div>

                <div className="pf-card__foot">
                  <span className="pf-sync">
                    <span className={`pf-sync__dot${dirty ? " is-dirty" : ""}`} aria-hidden />
                    {dirty ? "有未保存的更改" : "已与服务器同步"}
                  </span>
                  <button type="submit" className="btn-primary" disabled={loading || !dirty}>
                    {loading ? (
                      "保存中…"
                    ) : (
                      <>
                        <Check size={14} aria-hidden />
                        保存更改
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            <section className="pf-card">
              <header className="pf-card__head">
                <span className="pf-card__t">
                  <ShieldCheck size={13} className="pf-ic pf-ic--eme" aria-hidden />
                  账号安全
                </span>
                <span className="pf-card__state">修改后立即生效</span>
              </header>
              <form className="pf-card__body" onSubmit={savePassword}>
                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="oldPassword">
                      当前密码
                    </label>
                  </div>
                  <input
                    id="oldPassword"
                    name="oldPassword"
                    type="password"
                    className="sx-input"
                    autoComplete="current-password"
                    minLength={5}
                    maxLength={20}
                    placeholder="5–20 个字符"
                    required
                  />
                </div>
                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="newPassword">
                      新密码
                    </label>
                    <span className="sx-label">5–20 字符</span>
                  </div>
                  <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    className="sx-input"
                    autoComplete="new-password"
                    minLength={5}
                    maxLength={20}
                    placeholder="输入新密码"
                    required
                  />
                </div>
                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="newPassword2">
                      确认新密码
                    </label>
                  </div>
                  <input
                    id="newPassword2"
                    name="newPassword2"
                    type="password"
                    className="sx-input"
                    autoComplete="new-password"
                    minLength={5}
                    maxLength={20}
                    placeholder="再次输入新密码"
                    required
                  />
                </div>
                <div className="pf-card__foot">
                  <span className="pf-sync">
                    <KeyRound size={11} aria-hidden />
                    建议定期更换
                  </span>
                  <button type="submit" className="pf-btn pf-btn--strong" disabled={loading}>
                    {loading ? "提交中…" : "修改密码"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>

        {msg && <p className="pf-feedback pf-feedback--ok">{msg}</p>}
        {err && <p className="pf-feedback pf-feedback--err">{err}</p>}
      </main>

      {allSessionsOpen && (
        <AllSessionsModal
          total={stats?.sessionCount ?? null}
          onClose={() => setAllSessionsOpen(false)}
        />
      )}

      <footer className="site-foot">
        <div className="page-shell site-foot__in">PhysLab 3D — 交互式 3D 物理仿真平台</div>
      </footer>
    </div>
  );
}
