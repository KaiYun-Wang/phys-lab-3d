"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  changePassword,
  fetchMe,
  resetAvatar,
  updateProfile,
  uploadAvatar,
  type UserProfile,
} from "@/lib/api";
import { avatarInitials, avatarSrc, clearToken } from "@/lib/auth";
import { BrandLockup } from "@/components/BrandLogo";
import { ArrowLeft, Check, Lock, RotateCcw, ShieldCheck, Upload, User } from "lucide-react";

const NICKNAME_MAX = 20;
const BIO_MAX = 500;

/** 相对时间：最近登录显示 */
function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "刚刚";
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

function AvatarView({ user, size = "hero" }: { user: UserProfile; size?: "hero" | "form" }) {
  const src = avatarSrc(user.avatarUrl, API_BASE);
  const className = size === "hero" ? "avatar" : "avatar avatar-sm";
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <div className={className}>
        <img src={src} alt="头像" />
      </div>
    );
  }
  return <div className={className}>{avatarInitials(user.username)}</div>;
}

export default function ProfilePage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [section, setSection] = useState<"profile" | "security">("profile");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [academicEmail, setAcademicEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        setUser(u);
        setNickname(u.nickname);
        setBio(u.bio ?? "");
        setAcademicEmail(u.academicEmail ?? "");
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "加载失败"));
  }, []);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  function resetForm() {
    if (!user) return;
    setMsg("");
    setErr("");
    setNickname(user.nickname);
    setBio(user.bio ?? "");
    setAcademicEmail(user.academicEmail ?? "");
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const u = await updateProfile({
        nickname,
        bio: bio.trim(),
        academicEmail: academicEmail.trim(),
      });
      setUser(u);
      setNickname(u.nickname);
      setBio(u.bio ?? "");
      setAcademicEmail(u.academicEmail ?? "");
      setMsg("个人资料已保存");
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
      <div className="profile-page flex items-center justify-center">
        <p className="sx-eyebrow text-[#8d90a0]">{err || "加载中…"}</p>
      </div>
    );
  }

  const nicknameLen = nickname.length;
  const dirty =
    nickname !== user.nickname ||
    bio !== (user.bio ?? "") ||
    academicEmail !== (user.academicEmail ?? "");
  const lastLogin = timeAgo(user.lastLoginTime);

  return (
    <div className="profile-page">
      <header className="profile-navbar">
        <div className="page-shell profile-navbar-inner">
          <BrandLockup href="/" size={30} />

          <a href="/" className="kh-header__link">
            <ArrowLeft size={14} aria-hidden />
            返回实验
          </a>
        </div>
      </header>

      <main className="profile-body">
        <section className="profile-hero">
          <div className="profile-identity">
            <AvatarView user={user} />
            <div className="profile-meta">
              <span className="profile-handle">@{user.username}</span>
              <h1>{user.nickname}</h1>
              <p>
                <ShieldCheck size={12} className="inline mr-1 -mt-0.5" aria-hidden />
                {user.roleTitle ? `${user.roleTitle} · ` : ""}
                用户 ID {user.id}
                {lastLogin ? ` · 最近登录：${lastLogin}` : ""}
              </p>
            </div>
          </div>
        </section>

        <div className="profile-content-grid">
          <aside className="profile-panel">
            <p className="sx-control-group-title">设置</p>
            <div className="profile-sidebar-nav">
              <button
                type="button"
                className={section === "profile" ? "is-active" : ""}
                aria-current={section === "profile"}
                onClick={() => {
                  setSection("profile");
                  setMsg("");
                  setErr("");
                }}
              >
                <User size={15} className="mr-2 shrink-0" aria-hidden />
                基本资料
              </button>
              <button
                type="button"
                className={section === "security" ? "is-active" : ""}
                aria-current={section === "security"}
                onClick={() => {
                  setSection("security");
                  setMsg("");
                  setErr("");
                }}
              >
                <ShieldCheck size={15} className="mr-2 shrink-0" aria-hidden />
                账号安全
              </button>
              <button type="button" className="profile-logout" onClick={logout}>
                登出
              </button>
            </div>
          </aside>

          <div className="flex flex-col gap-4">
            {section === "profile" && (
              <section className="profile-panel">
                <p className="sx-control-group-title">基本资料</p>

                <form className="profile-form-grid" onSubmit={saveProfile}>
                  <div className="profile-field">
                    <div className="profile-field__head">
                      <span className="sx-label">头像</span>
                      <span className="sx-label">上传 / 恢复默认</span>
                    </div>
                    <div className="avatar-edit">
                      <AvatarView user={user} size="form" />
                      <div className="avatar-edit-actions">
                        <div className="avatar-edit-btns">
                          <button
                            type="button"
                            className="btn-ghost btn-ghost-sm"
                            disabled={loading}
                            onClick={() => fileRef.current?.click()}
                          >
                            <Upload size={13} className="mr-1.5" aria-hidden />
                            上传头像
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-ghost-sm btn-ghost-muted"
                            disabled={loading}
                            onClick={onAvatarReset}
                          >
                            <RotateCcw size={13} className="mr-1.5" aria-hidden />
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
                        <span className="sx-hint">
                          支持 JPG / PNG / WebP，不超过 2MB；未上传时显示用户名前 2 字
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="profile-field">
                    <div className="profile-field__head">
                      <label className="sx-label" htmlFor="username">
                        用户名
                      </label>
                      <span className="sx-label">唯一标识</span>
                    </div>
                    <div className="profile-locked">
                      <span className="profile-locked__value">@{user.username}</span>
                      <span className="profile-locked__tag">
                        <Lock size={11} aria-hidden />
                        锁定
                      </span>
                    </div>
                    <span className="profile-hint">用于登录与系统唯一定位，不可变更。</span>
                  </div>

                  <div className="profile-field">
                    <div className="profile-field__head">
                      <label className="sx-label" htmlFor="nickname">
                        昵称
                      </label>
                      <span
                        className={`profile-counter${nicknameLen >= NICKNAME_MAX ? " is-full" : ""}`}
                      >
                        {nicknameLen}/{NICKNAME_MAX}
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
                    <span className="profile-hint">
                      将在实验评审、共享实验库与在线讨论区中公开展示。
                    </span>
                  </div>

                  <div className="profile-field">
                    <div className="profile-field__head">
                      <label className="sx-label" htmlFor="bio">
                        个性签名 / 研学方向
                      </label>
                      <span
                        className={`profile-counter${bio.length >= BIO_MAX ? " is-full" : ""}`}
                      >
                        {bio.length}/{BIO_MAX}
                      </span>
                    </div>
                    <textarea
                      id="bio"
                      className="sx-input profile-textarea"
                      rows={3}
                      maxLength={BIO_MAX}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="写下你的学术研究重点…"
                    />
                  </div>

                  <div className="profile-field">
                    <div className="profile-field__head">
                      <label className="sx-label" htmlFor="academicEmail">
                        绑定学术邮箱
                      </label>
                      <span className="sx-label">
                        {user.emailVerified ? "已验证" : "未验证"}
                      </span>
                    </div>
                    <input
                      id="academicEmail"
                      type="email"
                      className="sx-input"
                      maxLength={160}
                      value={academicEmail}
                      onChange={(e) => setAcademicEmail(e.target.value)}
                      placeholder="如：you@university.edu.cn"
                    />
                    <span className="profile-hint">
                      {user.emailVerified
                        ? "已通过教育学术验证。"
                        : "仅做格式与唯一性校验；教育域名验证流程尚未开放。"}
                    </span>
                  </div>

                  <div className="profile-actions">
                    <span className="profile-autosave">
                      <span className="profile-autosave__dot" aria-hidden />
                      {dirty ? "有未保存的更改" : "已与服务器同步"}
                    </span>
                    <div className="profile-actions__btns">
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={loading || !dirty}
                        onClick={resetForm}
                      >
                        取消 / 重置
                      </button>
                      <button type="submit" className="btn-primary" disabled={loading || !dirty}>
                        {loading ? "正在保存…" : (
                          <>
                            <Check size={16} aria-hidden />
                            保存更改
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            )}

            {section === "security" && (
              <section className="profile-panel">
                <p className="sx-control-group-title">账号安全</p>
                <form className="profile-form-grid" onSubmit={savePassword}>
                  <div className="profile-field">
                    <div className="profile-field__head">
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

                  <div className="profile-field">
                    <div className="profile-field__head">
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
                      placeholder="5–20 个字符"
                      required
                    />
                  </div>

                  <div className="profile-field">
                    <div className="profile-field__head">
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

                  <div className="profile-actions">
                    <span className="profile-autosave">
                      <ShieldCheck size={13} aria-hidden />
                      密码以 BCrypt 哈希存储
                    </span>
                    <div className="profile-actions__btns">
                      <button type="submit" className="btn-primary" disabled={loading}>
                        {loading ? "正在提交…" : "修改密码"}
                      </button>
                    </div>
                  </div>
                </form>
              </section>
            )}

            {msg && <p className="profile-feedback profile-feedback-ok">{msg}</p>}
            {err && <p className="profile-feedback profile-feedback-err">{err}</p>}
          </div>
        </div>
      </main>

      <footer className="profile-footer">
        <div className="page-shell sx-eyebrow">PhysLab 3D — 交互式 3D 物理仿真平台</div>
      </footer>
    </div>
  );
}
