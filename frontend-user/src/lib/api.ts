import { clearToken, getToken, isTokenExpired } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const DEFAULT_EXPERIMENT_COVER = "/covers/experiment-cover.png";

export type SubjectType =
  | "MECHANICS"
  | "ELECTRICITY"
  | "OPTICS"
  | "QUANTUM"
  | "FLUID_MECHANICS"
  | "RELATIVITY"
  | "WAVE"
  | "ACOUSTICS";

const SUBJECT_TYPE_LABELS: Record<SubjectType, string> = {
  MECHANICS: "力学",
  ELECTRICITY: "电学",
  OPTICS: "光学",
  QUANTUM: "量子",
  FLUID_MECHANICS: "流体力学",
  RELATIVITY: "相对论",
  WAVE: "波动",
  ACOUSTICS: "声学",
};

export function getSubjectTypeLabel(subjectType: SubjectType | string): string {
  return SUBJECT_TYPE_LABELS[subjectType as SubjectType] ?? subjectType;
}

export type Experiment = {
  id: number;
  route: string;
  title: string;
  subjectTypeId?: number;
  subjectType: SubjectType;
  subjectTypeLabel?: string;
  description: string;
  coverUrl: string | null;
  topics: string[];
  status?: string;
  visitorCount?: number;
  favoriteCount?: number;
  viewCount?: number;
  commentCount?: number;
  favorited?: boolean;
};

export function experimentSubjectLabel(
  exp: Pick<Experiment, "subjectType" | "subjectTypeLabel">,
): string {
  return exp.subjectTypeLabel ?? getSubjectTypeLabel(exp.subjectType);
}

function useAuthIfAvailable(): boolean {
  const token = getToken();
  return !!token && !isTokenExpired(token);
}

export function experimentCoverSrc(coverUrl: string | null | undefined): string {
  if (!coverUrl) return DEFAULT_EXPERIMENT_COVER;
  if (coverUrl.startsWith("http")) return coverUrl;
  if (coverUrl.startsWith("/covers/")) return coverUrl;
  return `${API_BASE}${coverUrl}`;
}

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

export function fetchExperiments(q?: string) {
  const params = q ? `?q=${encodeURIComponent(q)}` : "";
  return apiFetch<Experiment[]>(`/api/experiments${params}`, {}, useAuthIfAvailable());
}

export function fetchExperiment(route: string) {
  return apiFetch<Experiment>(`/api/experiments/${route}`, {}, useAuthIfAvailable());
}

export function fetchFavorites() {
  return apiFetch<Experiment[]>("/api/users/me/favorites");
}

export function addFavorite(experimentId: number) {
  return apiFetch<void>(`/api/users/me/favorites/${experimentId}`, { method: "POST" });
}

export function removeFavorite(experimentId: number) {
  return apiFetch<void>(`/api/users/me/favorites/${experimentId}`, { method: "DELETE" });
}

export type Comment = {
  id: number;
  experimentId: number;
  userId: number;
  nickname?: string | null;
  avatarUrl?: string | null;
  rootId?: number | null;
  replyToId?: number | null;
  replyToUserId?: number | null;
  replyToNickname?: string | null;
  content: string;
  likeCount: number;
  liked?: boolean;
  createTime: string;
  replies?: Comment[];
};

export type CommentPage = {
  records: Comment[];
  total: number;
  page: number;
  pageSize: number;
};

export function fetchComments(
  experimentId: number,
  opts: { filter?: string; page?: number; size?: number } = {},
) {
  const params = new URLSearchParams();
  if (opts.filter) params.set("filter", opts.filter);
  params.set("page", String(opts.page ?? 1));
  params.set("size", String(opts.size ?? 20));
  return apiFetch<CommentPage>(
    `/api/experiments/${experimentId}/comments?${params}`,
    {},
    useAuthIfAvailable(),
  );
}

export function createComment(
  experimentId: number,
  body: { content: string; replyToId?: number | null },
) {
  return apiFetch<Comment>(`/api/experiments/${experimentId}/comments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteComment(experimentId: number, commentId: number) {
  return apiFetch<void>(`/api/experiments/${experimentId}/comments/${commentId}`, {
    method: "DELETE",
  });
}

export function likeComment(experimentId: number, commentId: number) {
  return apiFetch<void>(`/api/experiments/${experimentId}/comments/${commentId}/likes`, {
    method: "POST",
  });
}

export function unlikeComment(experimentId: number, commentId: number) {
  return apiFetch<void>(`/api/experiments/${experimentId}/comments/${commentId}/likes`, {
    method: "DELETE",
  });
}
