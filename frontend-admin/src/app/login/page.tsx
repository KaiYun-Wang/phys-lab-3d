"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { attachHoverMotion } from "@/lib/hoverMotion";

export default function LoginPage() {
  const router = useRouter();
  const pageRef = useRef<HTMLElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 登录页：保留按钮交互动效，但不播放音效（静态入口页保持克制）
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;
    return attachHoverMotion(root, { sound: false });
  }, []);

  function collectErrors() {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) errs.username = "请输入用户名";
    if (!password) errs.password = "请输入密码";
    return errs;
  }

  // 失焦即校验单字段（与用户端登录一致）
  function handleBlur(field: "username" | "password") {
    const errs = collectErrors();
    setFieldErrors((prev) => ({ ...prev, [field]: errs[field] }));
  }

  function handleChange(field: "username" | "password", value: string) {
    if (field === "username") setUsername(value);
    else setPassword(value);
    // 输入时即时清除该字段错误
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = collectErrors();
    if (errs.username || errs.password) {
      setFieldErrors(errs);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      setToken(res.token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen" ref={pageRef}>
      {/* 细密网格 + 光晕背景（与用户端 auth-backdrop 同款） */}
      <div className="auth-backdrop" aria-hidden>
        <span className="auth-backdrop__glyph" style={{ top: "24%", left: "3rem" }}>
          ψ(r,θ,φ) = Rₙₗ(r)·Yₗₘ(θ,φ)
        </span>
        <span className="auth-backdrop__glyph" style={{ bottom: "26%", right: "3.5rem" }}>
          ℏ = 1.0545718×10⁻³⁴ J·s
        </span>
        <span className="auth-backdrop__glyph" style={{ top: "68%", left: "9%" }}>
          ∮ E·dA = Q/ε₀
        </span>
      </div>

      <section className="auth-shell">
        <div className="auth-brand">
          <span className="auth-brand__logo">
            <i className="fa-solid fa-atom" aria-hidden />
          </span>
          <span className="auth-brand__name">PhysLab 3D</span>
        </div>

        <div className="auth-card">
          <div className="auth-card__head">
            <h1 className="auth-title">管理终端登录</h1>
            <p className="auth-subtitle">仅限授权管理员访问</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label htmlFor="username">用户名</label>
              <div className="auth-input-wrap">
                <span className="auth-input-wrap__icon">
                  <i className="fa-solid fa-user" aria-hidden />
                </span>
                <input
                  className={`text-input auth-input${fieldErrors.username ? " is-invalid" : ""}`}
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="管理员账号"
                  value={username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  onBlur={() => handleBlur("username")}
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby={fieldErrors.username ? "username-error" : undefined}
                  required
                />
                {fieldErrors.username ? (
                  <span className="auth-input-wrap__state auth-input-wrap__state--tail" aria-hidden>
                    <i className="fa-solid fa-circle-exclamation" />
                  </span>
                ) : null}
              </div>
              {fieldErrors.username ? (
                <p className="auth-field-error" id="username-error">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden />
                  {fieldErrors.username}
                </p>
              ) : null}
            </div>

            <div className="auth-field">
              <label htmlFor="password">密码</label>
              <div className="auth-input-wrap">
                <span className="auth-input-wrap__icon">
                  <i className="fa-solid fa-lock" aria-hidden />
                </span>
                <input
                  className={`text-input auth-input auth-input--peek${fieldErrors.password ? " is-invalid" : ""}`}
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  onBlur={() => handleBlur("password")}
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  required
                />
                <button
                  type="button"
                  className="auth-input-wrap__peek"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`} aria-hidden />
                </button>
                {fieldErrors.password ? (
                  <span className="auth-input-wrap__state" aria-hidden>
                    <i className="fa-solid fa-circle-exclamation" />
                  </span>
                ) : null}
              </div>
              {fieldErrors.password ? (
                <p className="auth-field-error" id="password-error">
                  <i className="fa-solid fa-circle-exclamation" aria-hidden />
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {error ? (
              <p className="auth-error" role="alert">
                <i className="fa-solid fa-circle-exclamation" aria-hidden />
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-pill btn-pill--primary auth-submit" disabled={loading}>
              <i className="fa-solid fa-right-to-bracket" aria-hidden />
              {loading ? "登录中…" : "进入控制台"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
