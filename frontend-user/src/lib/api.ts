import { clearToken, getToken, isTokenExpired } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

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

/** 无封面时返回 null，由 UI 用实验名占位 */
export function experimentCoverSrc(coverUrl: string | null | undefined): string | null {
  if (!coverUrl?.trim() || coverUrl === "/covers/experiment-cover.png") return null;
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
  ownerId: number;
  /** 0=用户，1=管理员 */
  ownerType: number;
  nickname?: string | null;
  avatarUrl?: string | null;
  rootId?: number | null;
  replyToId?: number | null;
  replyToOwnerId?: number | null;
  replyToOwnerType?: number | null;
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

/* ── AI 示例问题 ── */

export type AiExampleQuestion = {
  id: number;
  title: string;
  description?: string | null;
  question: string;
  sortOrder: number;
};

export function fetchAiExampleQuestions() {
  return apiFetch<AiExampleQuestion[]>("/api/ai/example-questions", {}, false);
}

/* ── AI 助手 ── */

export type AiChatContext = {
  path?: string;
  pageType?: string;
  experimentId?: number;
  experimentTitle?: string;
  experimentRoute?: string;
  /** 当前实验参数/读数快照，供演示工具使用 */
  snapshot?: Record<string, unknown>;
};

export type AiChatSession = {
  id: number;
  title: string;
  createTime: string;
  updateTime: string;
};

export type AiChatMessage = {
  id: number;
  sessionId: number;
  role: "user" | "assistant" | "system" | "status" | "thinking" | "tool_call" | "tool_result";
  content: string;
  thinking?: string | null;
  /** 页面上下文，或 tool_call/tool_result 的 name/arguments/toolCallId */
  context?: (AiChatContext & Record<string, unknown>) | Record<string, unknown> | null;
  createTime: string;
};

export type AiChatReply = {
  userMessage: AiChatMessage;
  assistantMessage: AiChatMessage;
  session: AiChatSession;
};

export type AiSessionPage = {
  records: AiChatSession[];
  total: number;
  page: number;
  pageSize: number;
};

export function fetchAiSessions(page = 1, size = 30) {
  return apiFetch<AiSessionPage>(`/api/users/me/ai/sessions?page=${page}&size=${size}`);
}

export function createAiSession() {
  return apiFetch<AiChatSession>("/api/users/me/ai/sessions", { method: "POST" });
}

export function deleteAiSession(sessionId: number) {
  return apiFetch<void>(`/api/users/me/ai/sessions/${sessionId}`, { method: "DELETE" });
}

export function fetchAiMessages(sessionId: number, opts: { beforeId?: number; limit?: number } = {}) {
  const params = new URLSearchParams();
  if (opts.beforeId) params.set("beforeId", String(opts.beforeId));
  params.set("limit", String(opts.limit ?? 40));
  return apiFetch<AiChatMessage[]>(
    `/api/users/me/ai/sessions/${sessionId}/messages?${params}`,
  );
}

export type AiStreamHandlers = {
  onMeta?: (meta: { sessionId: number; sessionTitle: string; userMessageId: number }) => void;
  onStatus?: (content: string) => void;
  onMessage?: (msg: AiChatMessage) => void;
  onClear?: () => void;
  onThinking?: (content: string) => void;
  onDelta?: (content: string) => void;
  onDone?: (done: {
    assistantMessageId: number;
    sessionId: number;
    sessionTitle: string;
    thinking?: string;
  }) => void;
  onError?: (message: string) => void;
};

export async function streamAiMessage(
  sessionId: number,
  content: string,
  context: AiChatContext | undefined,
  handlers: AiStreamHandlers = {},
  opts: { enableThinking?: boolean } = {},
) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/users/me/ai/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      content,
      context,
      enableThinking: !!opts.enableThinking,
    }),
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new Error("登录已过期");
  }
  if (!res.ok || !res.body) {
    let msg = "流式请求失败";
    try {
      const data = await res.json();
      msg = data.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part
        .split("\n")
        .map((l) => l.trim())
        .find((l) => l.startsWith("data:"));
      if (!line) continue;
      const raw = line.slice(5).trim();
      if (!raw) continue;
      try {
        const evt = JSON.parse(raw) as {
          type: string;
          content?: string;
          message?: string;
          thinking?: string;
          sessionId?: number;
          sessionTitle?: string;
          userMessageId?: number;
          assistantMessageId?: number;
          id?: number;
          role?: AiChatMessage["role"];
          context?: Record<string, unknown>;
          createTime?: string;
        };
        if (evt.type === "meta" && evt.sessionId != null && evt.userMessageId != null) {
          handlers.onMeta?.({
            sessionId: evt.sessionId,
            sessionTitle: evt.sessionTitle ?? "新对话",
            userMessageId: evt.userMessageId,
          });
        } else if (evt.type === "message" && evt.id != null && evt.role) {
          handlers.onMessage?.({
            id: evt.id,
            sessionId: evt.sessionId ?? sessionId,
            role: evt.role,
            content: evt.content ?? "",
            thinking: evt.thinking,
            context: evt.context,
            createTime: evt.createTime ?? new Date().toISOString(),
          });
        } else if (evt.type === "status" && evt.content) {
          handlers.onStatus?.(evt.content);
        } else if (evt.type === "clear") {
          handlers.onClear?.();
        } else if (evt.type === "thinking" && evt.content) {
          handlers.onThinking?.(evt.content);
        } else if (evt.type === "delta" && evt.content) {
          handlers.onDelta?.(evt.content);
        } else if (evt.type === "done" && evt.assistantMessageId != null && evt.sessionId != null) {
          handlers.onDone?.({
            assistantMessageId: evt.assistantMessageId,
            sessionId: evt.sessionId,
            sessionTitle: evt.sessionTitle ?? "新对话",
            thinking: evt.thinking,
          });
        } else if (evt.type === "error") {
          handlers.onError?.(evt.message ?? "流式对话失败");
        }
      } catch {
        /* ignore */
      }
    }
  }
}

export type Announcement = {
  id: number;
  title: string;
  content: string;
  createTime?: string;
  updateTime?: string;
};

export type AnnouncementPage = {
  records: Announcement[];
  total: number;
  page: number;
  pageSize: number;
};

/* ── AI 实验演示 ── */

export type DemoStep = {
  title: string;
  params: Record<string, unknown>;
  focus?: string;
  actionNarration?: string;
  resultNarration?: string;
};

export type DemoQuiz = {
  question: string;
  options: string[];
  answerIndex?: number;
  explanation?: string;
};

export type DemoPlan = {
  title?: string;
  overview?: string;
  steps?: DemoStep[];
  summary?: string;
  quiz?: DemoQuiz;
};

export type DemoSessionSummary = {
  id: number;
  experimentId: number;
  goal?: string;
  title: string;
  status: string;
  /** 已完成的大步骤数 */
  currentStep: number;
  totalSteps?: number;
  quizAnswerIndex?: number | null;
  quizCorrect?: boolean | null;
  createTime?: string;
  updateTime?: string;
};

export type DemoQuizResult = {
  chosenIndex: number;
  correct: boolean;
  answerIndex?: number;
  explanation?: string;
};

export type DemoSessionDetail = DemoSessionSummary & {
  plan: DemoPlan;
  quizResult?: DemoQuizResult;
};

export function fetchDemos(experimentId?: number) {
  const q = experimentId != null ? `?experimentId=${experimentId}` : "";
  return apiFetch<DemoSessionSummary[]>(`/api/users/me/demos${q}`);
}

export function fetchDemo(id: number) {
  return apiFetch<DemoSessionDetail>(`/api/users/me/demos/${id}`);
}

export function verifyDemoStep(
  id: number,
  stepIndex: number,
  body: { params: Record<string, unknown>; readings: Record<string, unknown> },
) {
  return apiFetch<{ ok: boolean; stepIndex: number; ideal: Record<string, number> }>(
    `/api/users/me/demos/${id}/steps/${stepIndex}/verify`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export function submitDemoQuiz(id: number, answerIndex: number) {
  return apiFetch<{
    correct: boolean;
    answerIndex: number;
    chosenIndex: number;
    explanation?: string;
  }>(`/api/users/me/demos/${id}/quiz/submit`, {
    method: "POST",
    body: JSON.stringify({ answerIndex }),
  });
}

export function updateDemoStatus(id: number, status: string) {
  return apiFetch<{ id: number; status: string }>(`/api/users/me/demos/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function clearDemoProgress(id: number) {
  return apiFetch<DemoSessionSummary>(`/api/users/me/demos/${id}/clear-progress`, {
    method: "POST",
    body: "{}",
  });
}

/** 解析 createDemo 工具返回：CREATED_DEMO id=… title=… steps=… overview=… */
export function parseCreatedDemo(content: string): {
  id: number;
  title: string;
  steps: number;
  overview: string;
} | null {
  const m = content.match(
    /CREATED_DEMO\s+id=(\d+)\s+title=(.*?)\s+steps=(\d+)\s+overview=([\s\S]*)/,
  );
  if (!m) return null;
  return {
    id: Number(m[1]),
    title: m[2].trim(),
    steps: Number(m[3]),
    overview: (m[4] ?? "").trim(),
  };
}

export function fetchLatestAnnouncement() {
  return apiFetch<Announcement | undefined>("/api/announcements/latest");
}

export function fetchAnnouncements(page = 1, size = 10) {
  return apiFetch<AnnouncementPage>(`/api/announcements?page=${page}&size=${size}`);
}


