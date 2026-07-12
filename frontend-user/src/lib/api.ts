import { clearToken, getToken } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type UserProfile = {
  id: number;
  username: string;
  nickname: string;
  avatarUrl: string | null;
};

export type LoginResponse = {
  token: string;
  user: UserProfile;
};

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.message ?? "请求失败";
  } catch {
    return "请求失败";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (res.status === 401 && auth) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error("登录已过期");
  }
  if (!res.ok) {
    throw new Error(await parseError(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function register(username: string, password: string) {
  return apiFetch<LoginResponse>(
    "/api/auth/register",
    { method: "POST", body: JSON.stringify({ username, password }) },
    false,
  );
}

export function login(username: string, password: string) {
  return apiFetch<LoginResponse>(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    false,
  );
}

export function fetchMe() {
  return apiFetch<UserProfile>("/api/users/me");
}

export function updateProfile(nickname: string) {
  return apiFetch<UserProfile>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify({ nickname }),
  });
}

export function changePassword(oldPassword: string, newPassword: string) {
  return apiFetch<{ message: string }>("/api/users/me/password", {
    method: "PUT",
    body: JSON.stringify({ oldPassword, newPassword }),
  });
}

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<UserProfile>("/api/users/me/avatar", { method: "POST", body: form });
}

export function resetAvatar() {
  return apiFetch<UserProfile>("/api/users/me/avatar", { method: "DELETE" });
}
