"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Lock, User } from "lucide-react";
import { login, register } from "@/lib/api";
import { markPendingAnnouncement, setToken } from "@/lib/auth";
import { BrandLockup } from "@/components/BrandLogo";

/** 「记住密码」把凭据存在本机，方便下次直接登录（仅本地便利，非安全边界） */
const REMEMBER_KEY = "physlab.remember";

/** 演示分支：登录页预填体验账号（后端只读模式只放行查询类请求；注册会被拦截提示，保留原 UI） */
const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "admin123";

/** 与后端 @Size 约束保持一致：username 3–20，password 5–20 */
const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const PASSWORD_MIN = 5;
const PASSWORD_MAX = 20;

type Remembered = { username: string; password: string };
type FieldErrors = { username?: string; password?: string; password2?: string };

function readRemembered(): Remembered | null {
  try {
    const raw = localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Remembered>;
    if (!parsed?.username) return null;
    return { username: parsed.username, password: parsed.password ?? "" };
  } catch {
    return null;
  }
}

function writeRemembered(value: Remembered | null) {
  try {
    if (value) localStorage.setItem(REMEMBER_KEY, JSON.stringify(value));
    else localStorage.removeItem(REMEMBER_KEY);
  } catch {
    /* 隐私模式下忽略 */
  }
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [username, setUsername] = useState(DEMO_USERNAME);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [password2, setPassword2] = useState("");

  const isLogin = tab === "login";

  // 回填「记住密码」（只在登录态生效，注册页始终是空表单）
  useEffect(() => {
    const saved = readRemembered();
    if (!saved) return;
    setUsername(saved.username);
    setPassword(saved.password);
    setRemember(true);
  }, []);

  /** 单字段校验；返回错误文案或 undefined */
  function validateField(field: keyof FieldErrors, values: Record<string, string>): string | undefined {
    if (field === "username") {
      const v = values.username;
      if (!v) return "请输入用户名";
      if (v.length < USERNAME_MIN) return `用户名至少 ${USERNAME_MIN} 个字符`;
      if (v.length > USERNAME_MAX) return `用户名最多 ${USERNAME_MAX} 个字符`;
      return undefined;
    }

    if (field === "password") {
      const v = values.password;
      if (!v) return "请输入密码";
      if (v.length < PASSWORD_MIN) return `密码至少 ${PASSWORD_MIN} 个字符`;
      if (v.length > PASSWORD_MAX) return `密码最多 ${PASSWORD_MAX} 个字符`;
      return undefined;
    }

    // 仅注册页有确认密码
    if (values.password2 !== values.password) return "两次输入的密码不一致";
    return undefined;
  }

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  function handleBlur(field: keyof FieldErrors) {
    const msg = validateField(field, { username, password, password2 });
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  }

  function switchTab(next: "login" | "register") {
    if (next === tab) return;
    setTab(next);
    setError("");
    setFieldErrors({});
    setShowPassword(false);

    if (next === "register") {
      // 注册必须是一张干净的表单，不能带上「记住密码」回填的凭据
      setUsername("");
      setPassword("");
      setPassword2("");
    } else {
      const saved = readRemembered();
      setUsername(saved?.username ?? DEMO_USERNAME);
      setPassword(saved?.password ?? DEMO_PASSWORD);
      setPassword2("");
      setRemember(!!saved);
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedUsername = username.trim();
    const values = { username: trimmedUsername, password, password2 };

    // 提交前统一校验（注册页额外校验确认密码）
    const fields: (keyof FieldErrors)[] = isLogin
      ? ["username", "password"]
      : ["username", "password", "password2"];
    const nextErrors: FieldErrors = {};
    for (const f of fields) nextErrors[f] = validateField(f, values);
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const res = isLogin
        ? await login(trimmedUsername, password, remember)
        : await register(trimmedUsername, password);

      writeRemembered(remember && isLogin ? { username: trimmedUsername, password } : null);

      setToken(res.token);
      markPendingAnnouncement();
      router.replace(searchParams.get("redirect") || "/");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "请求失败";
      // 用户名冲突直接挂到该字段上，而不是丢进通用错误条
      if (msg.includes("用户名已存在")) {
        setFieldErrors({ username: "该用户名已被占用，换一个试试" });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  /** 字段下方的灰色规则提示 */
  const usernameHint = isLogin ? null : `${USERNAME_MIN}–${USERNAME_MAX} 个字符`;
  const passwordHint = isLogin
    ? null
    : `${PASSWORD_MIN}–${PASSWORD_MAX} 个字符，区分大小写`;

  /** 渲染输入框下方的提示 / 错误行 */
  function renderFoot(id: string, hint: string | null, err?: string) {
    if (err) {
      return (
        <p className="auth-field-error" id={id} role="alert">
          <AlertCircle size={12} aria-hidden />
          {err}
        </p>
      );
    }
    if (hint) {
      return (
        <p className="auth-hint" id={id}>
          {hint}
        </p>
      );
    }
    return null;
  }

  return (
    <div className="auth-page">
      <div className="auth-backdrop" aria-hidden>
        <span className="auth-backdrop__glyph" style={{ top: "26%", left: "2.5rem" }}>
          ψ(r,θ,φ) = R_nl(r)Y_lm(θ,φ)
        </span>
        <span className="auth-backdrop__glyph" style={{ bottom: "30%", right: "3rem" }}>
          ℏ = 1.05457×10⁻³⁴ J·s
        </span>
      </div>

      <main className="auth-shell">
        <div className="auth-brand">
          {/* 纯展示，不做超链接、不可点击 */}
          <BrandLockup size={34} spin showTagline={false} />
        </div>

        <section className="auth-card">
          <h1 className="auth-title">{isLogin ? "登录" : "注册"}</h1>
          <p className="auth-subtitle">
            {isLogin ? "进入三维物理交互仿真终端" : "创建账号，开始你的物理实验"}
          </p>

          <div className="auth-tab-row" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`auth-tab${isLogin ? " is-active" : ""}`}
              onClick={() => switchTab("login")}
            >
              登录
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`auth-tab${!isLogin ? " is-active" : ""}`}
              onClick={() => switchTab("register")}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label className="sx-label" htmlFor="username">
                用户名
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-wrap__icon" aria-hidden>
                  <User size={18} />
                </span>
                <input
                  id="username"
                  name="username"
                  className={`sx-input${fieldErrors.username ? " is-invalid" : ""}`}
                  autoComplete="username"
                  minLength={USERNAME_MIN}
                  maxLength={USERNAME_MAX}
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    clearFieldError("username");
                  }}
                  onBlur={() => handleBlur("username")}
                  placeholder="请输入用户名"
                  aria-invalid={!!fieldErrors.username}
                  aria-describedby="username-foot"
                  required
                />
                {fieldErrors.username && (
                  <span className="auth-input-wrap__state auth-input-wrap__state--tail" aria-hidden>
                    <AlertCircle size={16} />
                  </span>
                )}
              </div>
              {renderFoot("username-foot", usernameHint, fieldErrors.username)}
            </div>

            <div className="auth-field">
              <label className="sx-label" htmlFor="password">
                密码
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-wrap__icon" aria-hidden>
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={`sx-input sx-input--peek${fieldErrors.password ? " is-invalid" : ""}`}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                    clearFieldError("password2");
                  }}
                  onBlur={() => handleBlur("password")}
                  placeholder="请输入密码"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby="password-foot"
                  required
                />
                <button
                  type="button"
                  className="auth-input-wrap__peek"
                  data-tooltip={showPassword ? "隐藏密码" : "显示密码"}
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                {fieldErrors.password && (
                  <span className="auth-input-wrap__state" aria-hidden>
                    <AlertCircle size={16} />
                  </span>
                )}
              </div>
              {renderFoot("password-foot", passwordHint, fieldErrors.password)}
            </div>

            {!isLogin && (
              <div className="auth-field">
                <label className="sx-label" htmlFor="password2">
                  确认密码
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-wrap__icon" aria-hidden>
                    <Lock size={18} />
                  </span>
                  <input
                    id="password2"
                    name="password2"
                    type={showPassword ? "text" : "password"}
                    className={`sx-input${fieldErrors.password2 ? " is-invalid" : ""}`}
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN}
                    maxLength={PASSWORD_MAX}
                    value={password2}
                    onChange={(e) => {
                      setPassword2(e.target.value);
                      clearFieldError("password2");
                    }}
                    onBlur={() => handleBlur("password2")}
                    placeholder="再次输入密码"
                    aria-invalid={!!fieldErrors.password2}
                    aria-describedby="password2-foot"
                    required
                  />
                  {/* 一致时给出正向反馈，减少反复试错 */}
                  {password2 && password2 === password && (
                    <span className="auth-input-wrap__state auth-input-wrap__state--tail is-ok" aria-hidden>
                      <Check size={16} />
                    </span>
                  )}
                  {fieldErrors.password2 && (
                    <span className="auth-input-wrap__state auth-input-wrap__state--tail" aria-hidden>
                      <AlertCircle size={16} />
                    </span>
                  )}
                </div>
                {renderFoot("password2-foot", null, fieldErrors.password2)}
              </div>
            )}

            {isLogin && (
              <label className="auth-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => {
                    setRemember(e.target.checked);
                    if (!e.target.checked) writeRemembered(null);
                  }}
                />
                <span>记住密码</span>
              </label>
            )}

            {error && (
              <p className="auth-error" role="alert">
                <AlertCircle size={14} aria-hidden />
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              <span>{loading ? "请稍候…" : isLogin ? "登录" : "注册"}</span>
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
