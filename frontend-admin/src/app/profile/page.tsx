"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  API_BASE,
  fetchMe,
  resetAdminAvatar,
  updateAdminProfile,
  uploadAdminAvatar,
  type AdminProfile,
} from "@/lib/api";
import { avatarSrc, displayInitials } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMe()
      .then((a) => {
        setAdmin(a);
        setDisplayName(a.displayName);
      })
      .catch(() => setAdmin(null));
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const a = await updateAdminProfile(displayName.trim());
      setAdmin(a);
      setDisplayName(a.displayName);
      toast.success("已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  async function onAvatarChange(file: File | undefined) {
    if (!file) return;
    setLoading(true);
    try {
      const a = await uploadAdminAvatar(file);
      setAdmin(a);
      toast.success("头像已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "上传失败");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onAvatarReset() {
    setLoading(true);
    try {
      const a = await resetAdminAvatar();
      setAdmin(a);
      toast.success("已恢复默认头像");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  if (!admin) return <div className="auth-loading">加载中…</div>;

  const src = avatarSrc(admin.avatarUrl, API_BASE);

  return (
    <AdminShell admin={admin} title="个人资料">
      <form className="experiment-form" onSubmit={saveProfile} style={{ maxWidth: 520 }}>
        <div className="profile-avatar-row">
          <div className="profile-avatar">
            {src ? <img src={src} alt="" /> : displayInitials(admin.displayName)}
          </div>
          <div className="profile-avatar-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => onAvatarChange(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn-pill btn-pill--primary btn-pill--sm"
              disabled={loading}
              onClick={() => fileRef.current?.click()}
            >
              上传头像
            </button>
            <button
              type="button"
              className="btn-pill btn-pill--outline btn-pill--sm"
              disabled={loading || !admin.avatarUrl}
              onClick={onAvatarReset}
            >
              恢复默认
            </button>
            <p className="micro">JPG / PNG / WebP，不超过 2MB</p>
          </div>
        </div>

        <div className="form-grid">
          <div className="field field--full">
            <label htmlFor="username">用户名</label>
            <input className="text-input" id="username" value={admin.username} disabled />
          </div>
          <div className="field field--full">
            <label htmlFor="displayName">展示名</label>
            <input
              className="text-input"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-pill btn-pill--primary" disabled={loading}>
            {loading ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
