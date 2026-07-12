"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login, register } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const username = String(form.get("username") ?? "");
    const password = String(form.get("password") ?? "");
    const password2 = String(form.get("password2") ?? "");

    if (tab === "register" && password !== password2) {
      setError("两次密码不一致");
      setLoading(false);
      return;
    }

    try {
      const res =
        tab === "login"
          ? await login(username, password)
          : await register(username, password);
      setToken(res.token);
      router.replace(searchParams.get("redirect") || "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <header className="auth-navbar">
        <div className="auth-navbar-inner">
          <span className="sx-eyebrow text-white">PhysLab 3D</span>
        </div>
      </header>

      <main className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">{tab === "login" ? "登录" : "注册"}</h1>

          <div className="auth-tab-row">
            <button
              type="button"
              className={`sx-chip ${tab === "login" ? "sx-chip-active" : ""}`}
              onClick={() => setTab("login")}
            >
              登录
            </button>
            <button
              type="button"
              className={`sx-chip ${tab === "register" ? "sx-chip-active" : ""}`}
              onClick={() => setTab("register")}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="sx-label" htmlFor="username">
                用户名
              </label>
              <input
                id="username"
                name="username"
                className="sx-input"
                minLength={3}
                maxLength={20}
                placeholder="3–20 个字符"
                required
              />
            </div>
            <div className="auth-field">
              <label className="sx-label" htmlFor="password">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="sx-input"
                minLength={5}
                maxLength={20}
                placeholder="5–20 个字符"
                required
              />
            </div>
            {tab === "register" && (
              <div className="auth-field">
                <label className="sx-label" htmlFor="password2">
                  确认密码
                </label>
                <input
                  id="password2"
                  name="password2"
                  type="password"
                  className="sx-input"
                  minLength={5}
                  maxLength={20}
                  placeholder="再次输入密码"
                  required
                />
              </div>
            )}
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn-ghost" disabled={loading}>
              {loading ? "请稍候…" : tab === "login" ? "登录" : "注册"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
