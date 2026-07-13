"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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
    <main className="login-screen">
      <div className="login-wrap">
        <div className="login-brand">
          <div className="login-brand__logo">P3</div>
          <span className="login-brand__name">PhysLab 3D</span>
          <span className="eyebrow">管理后台</span>
        </div>

        <div className="login-card">
          <div className="login-card__head">
            <span className="pill-tag pill-tag--mint">Admin</span>
            <h1>登录</h1>
            <p className="caption">使用管理员账号访问后台</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="username">用户名</label>
              <input
                className="text-input"
                id="username"
                type="text"
                placeholder="admin"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">密码</label>
              <input
                className="text-input"
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error ? <p className="form-error">{error}</p> : null}
            <button type="submit" className="btn-pill btn-pill--primary btn-pill--full" disabled={loading}>
              {loading ? "登录中…" : "登录"}
            </button>
          </form>
        </div>

        <p className="login-footer">
          返回{" "}
          <a href="http://localhost:3000" target="_blank" rel="noreferrer">
            用户端首页
          </a>
        </p>
      </div>
    </main>
  );
}
