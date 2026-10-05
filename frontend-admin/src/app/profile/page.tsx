"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  resetAdminAvatar,
  updateAdminProfile,
  uploadAdminAvatar,
} from "@/lib/api";
import { avatarSrc, clearToken, displayInitials } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import { useAdmin } from "@/components/AdminProvider";
import { useToast } from "@/components/Toast";

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const admin = useAdmin();
  const [displayName, setDisplayName] = useState(admin.displayName);
  const [loading, setLoading] = useState(false);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const a = await updateAdminProfile(displayName.trim());
      admin.updateAdmin(a);
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
      admin.updateAdmin(a);
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
      admin.updateAdmin(a);
      toast.success("已恢复默认头像");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    clearToken();
    router.replace("/login");
  }

  const src = avatarSrc(admin.avatarUrl, API_BASE);

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">账号设置</h2>
          <p className="caption">管理头像与展示名；修改密码请走账号安全流程</p>
        </div>
      </section>

      <form className="experiment-form card card--elevated mw-520" onSubmit={saveProfile}>
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
              <i className="fa-solid fa-camera" aria-hidden />
              上传头像
            </button>
            <button
              type="button"
              className="btn-pill btn-pill--warn btn-pill--sm"
              disabled={loading || !admin.avatarUrl}
              onClick={onAvatarReset}
            >
              <i className="fa-solid fa-rotate-left" aria-hidden />
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
          <button
            type="button"
            className="btn-pill btn-pill--outline row-actions__danger mr-auto"
            disabled={loading}
            onClick={logout}
          >
            <i className="fa-solid fa-right-from-bracket" aria-hidden />
            退出登录
          </button>
          <button type="submit" className="btn-pill btn-pill--primary" disabled={loading}>
            <i className="fa-solid fa-floppy-disk" aria-hidden />
            {loading ? "保存中…" : "保存"}
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
