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
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CircleAlert,
  CircleCheck,
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
import { playPress } from "@/lib/uiSound";

/** 昵称长度限制（与后端 @Size 约束保持一致） */
const NICKNAME_MIN = 3;
const NICKNAME_MAX = 10;
/** 密码长度限制（与后端 ChangePasswordRequest @Size 一致） */
const PASSWORD_MIN = 5;
const PASSWORD_MAX = 20;
/** 个人中心最近对话展示条数 */
const RECENT_SESSIONS = 5;
/** 收藏网格默认展示前 N 个（2×2），其余折叠 */
const FAV_COLLAPSED = 4;
/** 「全部对话」弹框每页条数（滚动加载下一页） */
const MODAL_PAGE_SIZE = 10;
/** 头像格式与大小限制（与后端校验一致，选择文件时前置拦截） */
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** 页面内提示浮层自动消失时长（与 CSS 出场动画对齐） */
const TOAST_DURATION = 3000;

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

/** 头像变更暂存：选择文件 / 恢复默认都只改本地预览，点「保存更改」才提交后端 */
type PendingAvatar = { kind: "file"; file: File; previewUrl: string } | { kind: "reset" } | null;

/** 表单字段级校验错误（失焦即校验，样式与登录页 auth 表单一致） */
type FieldErrors = {
  nickname?: string;
  oldPassword?: string;
  newPassword?: string;
  newPassword2?: string;
};

function AvatarView({
  src,
  initials,
  size = "xl",
  onOpen,
}: {
  src: string | null;
  initials: string;
  size?: "xl" | "form";
  onOpen?: (src: string) => void;
}) {
  const cls = size === "xl" ? "pf-ava pf-ava--xl" : "pf-ava pf-ava--md";
  const body = src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <div className={cls}>
      <img src={src} alt="头像" />
    </div>
  ) : (
    <div className={cls}>{initials}</div>
  );
  // 有图时可点开大图查看（同管理端实验封面交互）；无图（默认头像）不可点
  if (!src || !onOpen) return body;
  return (
    <button
      type="button"
      className="pf-ava-btn"
      onClick={() => onOpen(src)}
      aria-label="查看头像"
      data-tooltip="查看头像"
    >
      {body}
    </button>
  );
}

/** 头像大图查看层：点遮罩 / 右上角按钮 / Esc 关闭（对齐管理端封面大图交互） */
function AvatarLightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        playPress();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src, onClose]);

  if (!src) return null;

  const close = () => {
    playPress();
    onClose();
  };

  return (
    <div className="pf-modal-mask" role="presentation" onClick={close}>
      <div
        className="pf-ava-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label="头像大图预览"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="头像大图预览" className="pf-ava-lightbox__img" />
        <button type="button" className="pf-ava-lightbox__close" aria-label="关闭预览" onClick={close}>
          <X size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
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
  /** 未提交的本地头像预览 URL（objectURL，替换 / 清理时须 revoke） */
  const previewUrlRef = useRef<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [favorites, setFavorites] = useState<Experiment[]>([]);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [nickname, setNickname] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [allSessionsOpen, setAllSessionsOpen] = useState(false);
  /** 未提交的头像变更（本地预览），点「保存更改」才提交后端 */
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar>(null);
  /** 头像大图查看层的图片地址 */
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(null);
  const [toast, setToast] = useState<{ id: number; type: "ok" | "err"; text: string } | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  /** 页面提示浮层：新消息覆盖旧消息并重置自动消失计时 */
  const showToast = useCallback((type: "ok" | "err", text: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), type, text });
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_DURATION);
  }, []);

  // 卸载时清理未提交的本地预览与提示定时器
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    },
    [],
  );

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

  /** 单字段校验；返回错误文案或 undefined（规则文案与登录页保持一致） */
  function validateField(field: keyof FieldErrors, values: Record<string, string>): string | undefined {
    if (field === "nickname") {
      const v = (values.nickname ?? "").trim();
      if (!v) return "请输入昵称";
      if (v.length < NICKNAME_MIN) return `昵称至少 ${NICKNAME_MIN} 个字符`;
      if (v.length > NICKNAME_MAX) return `昵称最多 ${NICKNAME_MAX} 个字符`;
      return undefined;
    }
    if (field === "oldPassword") {
      if (!values.oldPassword) return "请输入当前密码";
      return undefined;
    }
    if (field === "newPassword") {
      const v = values.newPassword ?? "";
      if (!v) return "请输入新密码";
      if (v.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 个字符`;
      if (v.length > PASSWORD_MAX) return `密码最多 ${PASSWORD_MAX} 个字符`;
      return undefined;
    }
    // 确认新密码
    if (!values.newPassword2) return "请再次输入新密码";
    if (values.newPassword2 !== values.newPassword) return "两次输入的密码不一致";
    return undefined;
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  /** 失焦即校验单字段（与登录页一致） */
  function handleFieldBlur(field: keyof FieldErrors) {
    const msg = validateField(field, { nickname, oldPassword, newPassword, newPassword2 });
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = nickname.trim();
    const nameError = validateField("nickname", { nickname });
    if (nameError) {
      setFieldErrors((prev) => ({ ...prev, nickname: nameError }));
      return;
    }
    setLoading(true);
    try {
      let u = user;
      // 头像变更（此前仅本地预览）在保存时才提交后端存储路径
      if (pendingAvatar?.kind === "file") {
        u = await uploadAvatar(pendingAvatar.file);
      } else if (pendingAvatar?.kind === "reset") {
        u = await resetAvatar();
      }
      if (name !== u.nickname) {
        u = await updateProfile({ nickname: name });
      }
      setUser(u);
      setNickname(u.nickname);
      setFieldErrors((prev) => ({ ...prev, nickname: undefined }));
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPendingAvatar(null);
      showToast("ok", "已保存");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function savePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = { nickname, oldPassword, newPassword, newPassword2 };
    const errs: FieldErrors = {
      oldPassword: validateField("oldPassword", values),
      newPassword: validateField("newPassword", values),
      newPassword2: validateField("newPassword2", values),
    };
    if (errs.oldPassword || errs.newPassword || errs.newPassword2) {
      setFieldErrors((prev) => ({ ...prev, ...errs }));
      return;
    }
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      setOldPassword("");
      setNewPassword("");
      setNewPassword2("");
      setFieldErrors((prev) => ({
        ...prev,
        oldPassword: undefined,
        newPassword: undefined,
        newPassword2: undefined,
      }));
      showToast("ok", "密码已更新");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "修改失败");
    } finally {
      setLoading(false);
    }
  }

  /** 选择图片：仅本地预览与前置校验，点保存才真正上传 */
  function onAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      showToast("err", "仅支持 JPG / PNG / WebP 格式");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showToast("err", "图片不能超过 2MB");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setPendingAvatar({ kind: "file", file, previewUrl });
    if (fileRef.current) fileRef.current.value = "";
  }

  /** 恢复默认：仅切回本地默认头像显示，点保存才提交后端清除链接 */
  function onAvatarReset() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPendingAvatar({ kind: "reset" });
  }

  if (!user) {
    return (
      <div className="pf-page flex items-center justify-center">
        <p className="sx-eyebrow text-[#6b7280]">{err || "加载中…"}</p>
      </div>
    );
  }

  // 展示优先级：本地待提交文件预览 > 恢复默认（无图） > 服务端已存头像
  const displayAvatarSrc =
    pendingAvatar?.kind === "file"
      ? pendingAvatar.previewUrl
      : pendingAvatar?.kind === "reset"
        ? null
        : avatarSrc(user.avatarUrl, API_BASE);
  const hasAvatar =
    pendingAvatar?.kind === "file" ? true : pendingAvatar?.kind === "reset" ? false : !!user.avatarUrl;
  const avatarFallback = avatarInitials(user.nickname || user.username);
  const dirty = nickname.trim() !== user.nickname || pendingAvatar !== null;
  const visibleFavs = favorites.slice(0, FAV_COLLAPSED);

  return (
    <div className="pf-page">
      <header className="pf-nav">
        <div className="page-shell pf-nav__inner">
          <BrandLockup href="/" size={30} spin />
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
            <AvatarView src={displayAvatarSrc} initials={avatarFallback} onOpen={setAvatarPreviewSrc} />
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
              <form className="pf-card__body" onSubmit={saveProfile} noValidate>
                <div className="pf-ava-row">
                  <AvatarView
                    src={displayAvatarSrc}
                    initials={avatarFallback}
                    size="form"
                    onOpen={setAvatarPreviewSrc}
                  />
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
                      disabled={loading || !hasAvatar}
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
                <span className="pf-hint">支持 JPG / PNG / WebP，不超过 2MB；头像变更点「保存更改」后生效</span>

                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="nickname">
                      昵称
                    </label>
                  </div>
                  <input
                    id="nickname"
                    className={`sx-input${fieldErrors.nickname ? " is-invalid" : ""}`}
                    value={nickname}
                    onChange={(e) => {
                      const v = e.target.value;
                      setNickname(v);
                      // 不做截断：长度一旦不在 3-10 立即标红提示
                      setFieldErrors((prev) => ({ ...prev, nickname: validateField("nickname", { nickname: v }) }));
                    }}
                    onBlur={() => handleFieldBlur("nickname")}
                    placeholder="请输入昵称"
                    aria-invalid={!!fieldErrors.nickname}
                    required
                  />
                  {fieldErrors.nickname && (
                    <p className="auth-field-error" role="alert">
                      <AlertCircle size={12} aria-hidden />
                      {fieldErrors.nickname}
                    </p>
                  )}
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
              <form className="pf-card__body" onSubmit={savePassword} noValidate>
                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="oldPassword">
                      当前密码
                    </label>
                  </div>
                  <input
                    id="oldPassword"
                    type="password"
                    className={`sx-input${fieldErrors.oldPassword ? " is-invalid" : ""}`}
                    autoComplete="current-password"
                    minLength={PASSWORD_MIN}
                    maxLength={PASSWORD_MAX}
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value);
                      clearFieldError("oldPassword");
                    }}
                    onBlur={() => handleFieldBlur("oldPassword")}
                    placeholder="5–20 个字符"
                    aria-invalid={!!fieldErrors.oldPassword}
                    required
                  />
                  {fieldErrors.oldPassword && (
                    <p className="auth-field-error" role="alert">
                      <AlertCircle size={12} aria-hidden />
                      {fieldErrors.oldPassword}
                    </p>
                  )}
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
                    type="password"
                    className={`sx-input${fieldErrors.newPassword ? " is-invalid" : ""}`}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN}
                    maxLength={PASSWORD_MAX}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      clearFieldError("newPassword");
                      clearFieldError("newPassword2");
                    }}
                    onBlur={() => handleFieldBlur("newPassword")}
                    placeholder="输入新密码"
                    aria-invalid={!!fieldErrors.newPassword}
                    required
                  />
                  {fieldErrors.newPassword && (
                    <p className="auth-field-error" role="alert">
                      <AlertCircle size={12} aria-hidden />
                      {fieldErrors.newPassword}
                    </p>
                  )}
                </div>
                <div className="pf-field">
                  <div className="pf-field__head">
                    <label className="sx-label" htmlFor="newPassword2">
                      确认新密码
                    </label>
                  </div>
                  <input
                    id="newPassword2"
                    type="password"
                    className={`sx-input${fieldErrors.newPassword2 ? " is-invalid" : ""}`}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN}
                    maxLength={PASSWORD_MAX}
                    value={newPassword2}
                    onChange={(e) => {
                      setNewPassword2(e.target.value);
                      clearFieldError("newPassword2");
                    }}
                    onBlur={() => handleFieldBlur("newPassword2")}
                    placeholder="再次输入新密码"
                    aria-invalid={!!fieldErrors.newPassword2}
                    required
                  />
                  {fieldErrors.newPassword2 && (
                    <p className="auth-field-error" role="alert">
                      <AlertCircle size={12} aria-hidden />
                      {fieldErrors.newPassword2}
                    </p>
                  )}
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

      </main>

      {/* 操作反馈浮层：保存 / 修改密码等成功失败统一在此弹出 */}
      {toast && (
        <div className="pf-toast-stack" aria-live="polite">
          <div key={toast.id} className={`pf-toast pf-toast--${toast.type}`} role="status">
            {toast.type === "ok" ? (
              <CircleCheck size={14} aria-hidden />
            ) : (
              <CircleAlert size={14} aria-hidden />
            )}
            {toast.text}
          </div>
        </div>
      )}

      {allSessionsOpen && (
        <AllSessionsModal
          total={stats?.sessionCount ?? null}
          onClose={() => setAllSessionsOpen(false)}
        />
      )}

      <AvatarLightbox src={avatarPreviewSrc} onClose={() => setAvatarPreviewSrc(null)} />

      <footer className="site-foot">
        <div className="page-shell site-foot__in">PhysLab 3D — 交互式 3D 物理仿真平台</div>
      </footer>
    </div>
  );
}
