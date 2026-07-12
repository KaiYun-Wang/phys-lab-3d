"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
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

function AvatarView({ user, size = "hero" }: { user: UserProfile; size?: "hero" | "form" }) {
  const src = avatarSrc(user.avatarUrl, API_BASE);
  const className = size === "hero" ? "avatar" : "avatar avatar-sm";
  if (src) {
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
  }, []);

  function logout() {
    clearToken();
    router.replace("/login");
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMsg("");
    setErr("");
    setLoading(true);
    try {
      const u = await updateProfile(nickname);
      setUser(u);
      setMsg("已保存");
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
        <p className="sx-eyebrow text-[#8a8a96]">{err || "加载中…"}</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <header className="profile-navbar">
        <div className="profile-navbar-inner">
          <Link href="/" className="sx-eyebrow">
            PhysLab 3D
          </Link>
          <Link href="/" className="sx-eyebrow">
            返回实验
          </Link>
        </div>
      </header>

      <main className="profile-body">
        <section className="sx-section">
          <p className="sx-eyebrow">个人中心</p>
          <div className="profile-hero">
            <div className="profile-identity">
              <AvatarView user={user} />
              <div className="profile-meta">
                <h1>{user.nickname}</h1>
                <p>@{user.username}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="profile-content-grid">
          <aside className="profile-panel">
            <p className="sx-control-group-title">设置</p>
            <div className="profile-sidebar-nav">
              <button
                type="button"
                className={section === "profile" ? "sx-chip-active" : ""}
                onClick={() => setSection("profile")}
              >
                基本资料
              </button>
              <button
                type="button"
                className={section === "security" ? "sx-chip-active" : ""}
                onClick={() => setSection("security")}
              >
                账号安全
              </button>
              <button type="button" className="profile-logout" onClick={logout}>
                登出
              </button>
            </div>
          </aside>

          <div>
            {section === "profile" && (
              <section className="profile-panel">
                <p className="sx-control-group-title">基本资料</p>
                <form className="profile-form-grid" onSubmit={saveProfile}>
                  <div className="profile-field">
                    <span className="sx-label">头像</span>
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
                            上传头像
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-ghost-sm btn-ghost-muted"
                            disabled={loading}
                            onClick={onAvatarReset}
                          >
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
                    <label className="sx-label" htmlFor="username">
                      用户名
                    </label>
                    <input id="username" className="sx-input" value={user.username} disabled />
                  </div>
                  <div className="profile-field">
                    <label className="sx-label" htmlFor="nickname">
                      昵称
                    </label>
                    <input
                      id="nickname"
                      className="sx-input"
                      maxLength={20}
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-ghost btn-ghost-sm" disabled={loading}>
                    保存
                  </button>
                </form>
              </section>
            )}

            {section === "security" && (
              <section className="profile-panel">
                <p className="sx-control-group-title">账号安全</p>
                <form className="profile-form-grid" onSubmit={savePassword}>
                  <div className="profile-field">
                    <label className="sx-label" htmlFor="oldPassword">
                      当前密码
                    </label>
                    <input
                      id="oldPassword"
                      name="oldPassword"
                      type="password"
                      className="sx-input"
                      minLength={5}
                      maxLength={20}
                      placeholder="5–20 个字符"
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label className="sx-label" htmlFor="newPassword">
                      新密码
                    </label>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      className="sx-input"
                      minLength={5}
                      maxLength={20}
                      placeholder="5–20 个字符"
                      required
                    />
                  </div>
                  <div className="profile-field">
                    <label className="sx-label" htmlFor="newPassword2">
                      确认新密码
                    </label>
                    <input
                      id="newPassword2"
                      name="newPassword2"
                      type="password"
                      className="sx-input"
                      minLength={5}
                      maxLength={20}
                      placeholder="再次输入新密码"
                      required
                    />
                  </div>
                  <button type="submit" className="btn-ghost btn-ghost-sm" disabled={loading}>
                    修改密码
                  </button>
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
