const TOKEN_KEY = "jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const PENDING_ANNOUNCEMENT_KEY = "phys_lab_pending_announcement";

/** 登录成功后标记：进入首页后弹出最新公告 */
export function markPendingAnnouncement() {
  sessionStorage.setItem(PENDING_ANNOUNCEMENT_KEY, "1");
}

export function hasPendingAnnouncement(): boolean {
  return sessionStorage.getItem(PENDING_ANNOUNCEMENT_KEY) === "1";
}

export function clearPendingAnnouncement() {
  sessionStorage.removeItem(PENDING_ANNOUNCEMENT_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (!payload.exp) return true;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

export function isAuthenticated(): boolean {
  const token = getToken();
  return !!token && !isTokenExpired(token);
}

export function avatarInitials(username: string): string {
  return (username || "").slice(0, 2).toUpperCase() || "?";
}

export function avatarSrc(avatarUrl: string | null | undefined, apiBase: string): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith("http")) return avatarUrl;
  return `${apiBase}${avatarUrl}`;
}
