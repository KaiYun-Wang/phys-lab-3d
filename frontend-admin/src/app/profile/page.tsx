"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  resetAdminAvatar,
  updateAdminProfile,
  uploadAdminAvatar,
  type AdminProfile,
} from "@/lib/api";
import { avatarSrc, clearToken, displayInitials } from "@/lib/auth";
import AdminShell from "@/components/AdminShell";
import CoverLightbox from "@/components/CoverLightbox";
import { useAdmin } from "@/components/AdminProvider";
import { useToast } from "@/components/Toast";

/**
 * 管理端账号设置页：头像（本地预览 + 保存时提交）与展示名（失焦即校验）。
 */
/** 头像格式与大小限制（与后端校验一致，选择文件时前置拦截） */
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** 展示名长度限制（与后端 @Size 约束保持一致） */
const NAME_MIN = 3;
const NAME_MAX = 10;

/** 头像变更暂存：选择文件 / 恢复默认都只改本地预览，点「保存」才提交后端 */
type PendingAvatar = { kind: "file"; file: File; previewUrl: string } | { kind: "reset" } | null;

export default function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  /** 未提交的本地头像预览 URL（objectURL，替换 / 清理时须 revoke） */
  const previewUrlRef = useRef<string | null>(null);
  const admin = useAdmin();
  const [displayName, setDisplayName] = useState(admin.displayName);
  /** 展示名字段级校验错误（样式与登录页 auth 表单一致） */
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  /** 未提交的头像变更（本地预览），点「保存」才提交后端 */
  const [pendingAvatar, setPendingAvatar] = useState<PendingAvatar>(null);
  /** 头像大图查看层的图片地址 */
  const [avatarPreviewSrc, setAvatarPreviewSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 卸载时清理未提交的本地预览
  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  /** 展示名单字段校验；返回错误文案或 undefined（与登录页同一套规则文案） */
  function validateName(value: string): string | undefined {
    const v = value.trim();
    if (!v) return "请输入展示名";
    if (v.length < NAME_MIN) return `展示名至少 ${NAME_MIN} 个字符`;
    if (v.length > NAME_MAX) return `展示名最多 ${NAME_MAX} 个字符`;
    return undefined;
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    const nameErr = validateName(displayName);
    if (nameErr) {
      setNameError(nameErr);
      return;
    }
    setLoading(true);
    try {
      let a: AdminProfile = admin;
      // 头像变更（此前仅本地预览）在保存时才提交后端存储路径
      if (pendingAvatar?.kind === "file") {
        a = await uploadAdminAvatar(pendingAvatar.file);
      } else if (pendingAvatar?.kind === "reset") {
        a = await resetAdminAvatar();
      }
      if (displayName.trim() !== a.displayName) {
        a = await updateAdminProfile(displayName.trim());
      }
      admin.updateAdmin(a);
      setDisplayName(a.displayName);
      setNameError(undefined);
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
      setPendingAvatar(null);
      toast.success("已保存");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  /** 选择图片：仅本地预览与前置校验，点保存才真正上传 */
  function onAvatarChange(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) {
      toast.error("仅支持 JPG / PNG / WebP 格式");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      toast.error("图片不能超过 2MB");
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

  function logout() {
    clearToken();
    router.replace("/login");
  }

  // 展示优先级：本地待提交文件预览 > 恢复默认（无图） > 服务端已存头像
  const src =
    pendingAvatar?.kind === "file"
      ? pendingAvatar.previewUrl
      : pendingAvatar?.kind === "reset"
        ? null
        : avatarSrc(admin.avatarUrl, API_BASE);
  const hasAvatar =
    pendingAvatar?.kind === "file" ? true : pendingAvatar?.kind === "reset" ? false : !!admin.avatarUrl;

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">账号设置</h2>
        </div>
      </section>

      <form className="experiment-form card card--elevated mw-520" onSubmit={saveProfile} noValidate>
        <div className="profile-avatar-row">
          {src ? (
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={() => setAvatarPreviewSrc(src)}
              aria-label="查看头像"
              data-tooltip="查看头像"
            >
              <span className="profile-avatar">
                <img src={src} alt="" />
              </span>
            </button>
          ) : (
            <div className="profile-avatar">{displayInitials(displayName.trim() || admin.displayName)}</div>
          )}
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
              disabled={loading || !hasAvatar}
              onClick={onAvatarReset}
            >
              <i className="fa-solid fa-rotate-left" aria-hidden />
              恢复默认
            </button>
            <p className="micro">JPG / PNG / WebP，不超过 2MB；头像变更点「保存」后生效</p>
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
              className={`text-input${nameError ? " is-invalid" : ""}`}
              id="displayName"
              value={displayName}
              onChange={(e) => {
                const v = e.target.value;
                setDisplayName(v);
                // 不做截断：长度一旦不在 3-10 立即标红提示
                setNameError(validateName(v));
              }}
              onBlur={() => setNameError(validateName(displayName))}
              aria-invalid={!!nameError}
              required
            />
            {nameError ? (
              <p className="auth-field-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" aria-hidden />
                {nameError}
              </p>
            ) : null}
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

      <CoverLightbox
        src={avatarPreviewSrc}
        onClose={() => setAvatarPreviewSrc(null)}
        label="头像大图预览"
      />
    </AdminShell>
  );
}
