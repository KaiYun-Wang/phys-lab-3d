import { clearToken, getToken } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export type AdminProfile = {
  id: number;
  username: string;
  displayName: string;
};

export type AdminLoginResponse = {
  token: string;
  admin: AdminProfile;
};

export type DashboardSummary = {
  userCount: number;
  experimentCount: number;
  todayVisitCount: number;
  activeExperimentCount: number;
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
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export function login(username: string, password: string) {
  return apiFetch<AdminLoginResponse>(
    "/api/admin/auth/login",
    { method: "POST", body: JSON.stringify({ username, password }) },
    false,
  );
}

export function fetchMe() {
  return apiFetch<AdminProfile>("/api/admin/me");
}

export function fetchDashboardSummary() {
  return apiFetch<DashboardSummary>("/api/admin/dashboard/summary");
}

export type AnnouncementRecord = {
  id: number;
  title: string;
  content: string;
  createTime?: string;
  updateTime?: string;
};

export type AnnouncementInput = {
  title: string;
  content: string;
};

export function fetchAnnouncements(page = 1, size = 20) {
  return apiFetch<AdminPageResponse<AnnouncementRecord>>(
    `/api/admin/announcements?page=${page}&size=${size}`,
  );
}

export function fetchAnnouncement(id: number) {
  return apiFetch<AnnouncementRecord>(`/api/admin/announcements/${id}`);
}

export function createAnnouncement(input: AnnouncementInput) {
  return apiFetch<AnnouncementRecord>("/api/admin/announcements", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAnnouncement(id: number, input: AnnouncementInput) {
  return apiFetch<AnnouncementRecord>(`/api/admin/announcements/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAnnouncement(id: number) {
  return apiFetch<void>(`/api/admin/announcements/${id}`, { method: "DELETE" });
}

export type ExperimentStatus = "PUBLISHED" | "DRAFT";

export const EXPERIMENT_STATUS_OPTIONS: { value: ExperimentStatus; label: string }[] = [
  { value: "PUBLISHED", label: "已发布" },
  { value: "DRAFT", label: "草稿" },
];

export function getExperimentStatusLabel(status: ExperimentStatus | string): string {
  return EXPERIMENT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? "草稿";
}

export function isExperimentPublished(status: ExperimentStatus | string): boolean {
  return status === "PUBLISHED";
}

export type SubjectTypeCode =
  | "MECHANICS"
  | "ELECTRICITY"
  | "OPTICS"
  | "QUANTUM"
  | "FLUID_MECHANICS"
  | "RELATIVITY"
  | "WAVE"
  | "ACOUSTICS";

/** @deprecated Use SubjectTypeRecord from API */
export type SubjectType = SubjectTypeCode;

export const SUBJECT_TYPE_OPTIONS: { value: SubjectTypeCode; label: string }[] = [
  { value: "MECHANICS", label: "力学" },
  { value: "ELECTRICITY", label: "电学" },
  { value: "OPTICS", label: "光学" },
  { value: "QUANTUM", label: "量子" },
  { value: "FLUID_MECHANICS", label: "流体力学" },
  { value: "RELATIVITY", label: "相对论" },
  { value: "WAVE", label: "波动" },
  { value: "ACOUSTICS", label: "声学" },
];

export type SubjectTypeRecord = {
  id: number;
  code: string;
  label: string;
  description?: string | null;
  sortOrder?: number;
  experimentCount?: number;
  createTime?: string;
  updateTime?: string;
};

export type SubjectTypeInput = {
  code: string;
  label: string;
  description?: string;
  sortOrder?: number;
};

export type SubjectTypeListResponse = {
  items: SubjectTypeRecord[];
  total: number;
};

export function getSubjectTypeLabel(
  subjectType: SubjectTypeCode | string,
  types?: SubjectTypeRecord[],
): string {
  const fromApi = types?.find((t) => t.code === subjectType || String(t.id) === subjectType);
  if (fromApi) return fromApi.label;
  return SUBJECT_TYPE_OPTIONS.find((o) => o.value === subjectType)?.label ?? subjectType;
}

export function getFallbackSubjectTypes(): SubjectTypeRecord[] {
  return SUBJECT_TYPE_OPTIONS.map((opt, index) => ({
    id: index + 1,
    code: opt.value,
    label: opt.label,
    sortOrder: index,
  }));
}

function parseSubjectTypeList(
  data: SubjectTypeRecord[] | SubjectTypeListResponse,
): SubjectTypeListResponse {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  const items = data.items ?? [];
  const total = data.total ?? items.length;
  return { items, total };
}

export function fetchSubjectTypes() {
  return apiFetch<SubjectTypeRecord[] | SubjectTypeListResponse>("/api/admin/subject-types").then(
    parseSubjectTypeList,
  );
}

export function fetchSubjectType(id: number) {
  return apiFetch<SubjectTypeRecord>(`/api/admin/subject-types/${id}`);
}

export function createSubjectType(input: SubjectTypeInput) {
  return apiFetch<SubjectTypeRecord>("/api/admin/subject-types", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateSubjectType(id: number, input: Omit<SubjectTypeInput, "code">) {
  return apiFetch<SubjectTypeRecord>(`/api/admin/subject-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteSubjectType(id: number) {
  return apiFetch<void>(`/api/admin/subject-types/${id}`, { method: "DELETE" });
}

export type Experiment = {
  id: number;
  route: string;
  title: string;
  subjectTypeId: number;
  subjectTypeLabel?: string;
  subjectTypeCode?: string;
  /** @deprecated Legacy API field */
  subjectType?: SubjectTypeCode;
  description: string;
  coverUrl: string | null;
  topics: string[];
  status: ExperimentStatus;
  visitorCount: number;
  favoriteCount: number;
  viewCount: number;
  commentCount: number;
  createTime?: string;
  updateTime?: string;
};

export type ExperimentInput = {
  route: string;
  title: string;
  subjectTypeId: number;
  description: string;
  coverUrl?: string;
  topics: string[];
  status: ExperimentStatus;
};

export function getExperimentSubjectLabel(
  experiment: Experiment,
  types?: SubjectTypeRecord[],
): string {
  if (experiment.subjectTypeLabel) return experiment.subjectTypeLabel;
  const code = experiment.subjectTypeCode ?? experiment.subjectType;
  if (code) return getSubjectTypeLabel(code, types);
  const fromId = types?.find((t) => t.id === experiment.subjectTypeId);
  return fromId?.label ?? String(experiment.subjectTypeId);
}

export type ExperimentListParams = {
  q?: string;
  status?: ExperimentStatus | "all";
};

export type ExperimentListResponse = {
  items: Experiment[];
  total: number;
};

type ExperimentPageResponse = {
  records?: Experiment[];
  items?: Experiment[];
  total?: number;
};

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function parseExperimentList(
  data: Experiment[] | ExperimentListResponse | ExperimentPageResponse,
): ExperimentListResponse {
  if (Array.isArray(data)) {
    return { items: data, total: data.length };
  }
  const items = "records" in data ? (data.records ?? []) : (data.items ?? []);
  const total = data.total ?? items.length;
  return { items, total };
}

export function fetchExperiments(params: ExperimentListParams = {}) {
  const query = buildQuery({
    q: params.q,
    status: params.status && params.status !== "all" ? params.status : undefined,
  });
  return apiFetch<Experiment[] | ExperimentListResponse | ExperimentPageResponse>(
    `/api/admin/experiments${query}`,
  ).then(parseExperimentList);
}

export function fetchExperiment(id: number) {
  return apiFetch<Experiment>(`/api/admin/experiments/${id}`);
}

export function createExperiment(input: ExperimentInput) {
  return apiFetch<Experiment>("/api/admin/experiments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateExperiment(id: number, input: Omit<ExperimentInput, "route">) {
  return apiFetch<Experiment>(`/api/admin/experiments/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteExperiment(id: number) {
  return apiFetch<void>(`/api/admin/experiments/${id}`, { method: "DELETE" });
}

export type CoverUploadResponse = {
  coverUrl: string;
};

export function uploadExperimentCover(file: Blob) {
  const form = new FormData();
  form.append("file", file, "cover.jpg");
  return apiFetch<CoverUploadResponse>("/api/admin/experiments/cover", {
    method: "POST",
    body: form,
  });
}

export type AdminPageResponse<T> = {
  records: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminFavorite = {
  id: number;
  userId: number;
  username?: string | null;
  nickname?: string | null;
  experimentId: number;
  experimentTitle?: string | null;
  experimentRoute?: string | null;
  createTime?: string;
};

export type AdminComment = {
  id: number;
  experimentId: number;
  experimentTitle?: string | null;
  experimentRoute?: string | null;
  ownerId: number;
  /** 0=用户，1=管理员 */
  ownerType: number;
  username?: string | null;
  nickname?: string | null;
  rootId?: number | null;
  replyToId?: number | null;
  content: string;
  likeCount: number;
  status: string;
  createTime?: string;
  updateTime?: string;
};

export type AdminCommentLike = {
  id: number;
  commentId: number;
  commentContent?: string | null;
  experimentId?: number | null;
  experimentTitle?: string | null;
  userId: number;
  username?: string | null;
  nickname?: string | null;
  createTime?: string;
};

export function fetchAdminFavorites(params: {
  keyword?: string;
  experimentId?: string;
  userId?: string;
  page?: number;
  size?: number;
} = {}) {
  const query = buildQuery({
    keyword: params.keyword,
    experimentId: params.experimentId,
    userId: params.userId,
    page: String(params.page ?? 1),
    size: String(params.size ?? 20),
  });
  return apiFetch<AdminPageResponse<AdminFavorite>>(`/api/admin/favorites${query}`);
}

export function deleteAdminFavorite(id: number) {
  return apiFetch<void>(`/api/admin/favorites/${id}`, { method: "DELETE" });
}

export function fetchAdminComments(params: {
  experimentId?: string;
  ownerId?: string;
  ownerType?: string;
  status?: string;
  keyword?: string;
  page?: number;
  size?: number;
} = {}) {
  const query = buildQuery({
    experimentId: params.experimentId,
    ownerId: params.ownerId,
    ownerType: params.ownerType,
    status: params.status && params.status !== "all" ? params.status : undefined,
    keyword: params.keyword,
    page: String(params.page ?? 1),
    size: String(params.size ?? 20),
  });
  return apiFetch<AdminPageResponse<AdminComment>>(`/api/admin/comments${query}`);
}

export function replyAdminComment(body: {
  experimentId: number;
  replyToId: number;
  content: string;
}) {
  return apiFetch<AdminComment>(`/api/admin/comments/reply`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateAdminCommentStatus(id: number, status: "VISIBLE" | "HIDDEN") {
  return apiFetch<void>(`/api/admin/comments/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function deleteAdminComment(id: number) {
  return apiFetch<void>(`/api/admin/comments/${id}`, { method: "DELETE" });
}

export function fetchAdminCommentLikes(params: {
  commentId?: string;
  userId?: string;
  experimentId?: string;
  page?: number;
  size?: number;
} = {}) {
  const query = buildQuery({
    commentId: params.commentId,
    userId: params.userId,
    experimentId: params.experimentId,
    page: String(params.page ?? 1),
    size: String(params.size ?? 20),
  });
  return apiFetch<AdminPageResponse<AdminCommentLike>>(`/api/admin/comment-likes${query}`);
}

export function deleteAdminCommentLike(id: number) {
  return apiFetch<void>(`/api/admin/comment-likes/${id}`, { method: "DELETE" });
}

/* ── 知识库 / AI 试聊 ── */

export type KbDocument = {
  id: number;
  title: string;
  filename: string;
  contentType: string | null;
  status: string;
  chunkCount: number;
  createTime: string;
  updateTime: string;
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
  role: "user" | "assistant" | "system" | "status";
  content: string;
  thinking?: string | null;
  createTime: string;
};

export type AiChatReply = {
  userMessage: AiChatMessage;
  assistantMessage: AiChatMessage;
  session: AiChatSession;
};

export function fetchKbDocuments(page = 1, size = 20) {
  return apiFetch<AdminPageResponse<KbDocument>>(
    `/api/admin/knowledge/documents?page=${page}&size=${size}`,
  );
}

export function uploadKbDocument(file: File, title?: string) {
  const form = new FormData();
  form.append("file", file);
  if (title?.trim()) form.append("title", title.trim());
  return apiFetch<KbDocument>("/api/admin/knowledge/documents", {
    method: "POST",
    body: form,
  });
}

export function deleteKbDocument(id: number) {
  return apiFetch<void>(`/api/admin/knowledge/documents/${id}`, { method: "DELETE" });
}

export function fetchAdminAiSessions(page = 1, size = 30) {
  return apiFetch<AdminPageResponse<AiChatSession>>(
    `/api/admin/ai/sessions?page=${page}&size=${size}`,
  );
}

export function createAdminAiSession() {
  return apiFetch<AiChatSession>("/api/admin/ai/sessions", { method: "POST" });
}

export function fetchAdminAiMessages(sessionId: number, limit = 50) {
  return apiFetch<AiChatMessage[]>(
    `/api/admin/ai/sessions/${sessionId}/messages?limit=${limit}`,
  );
}

export function deleteAdminAiSession(sessionId: number) {
  return apiFetch<void>(`/api/admin/ai/sessions/${sessionId}`, { method: "DELETE" });
}

export type AdminAiStreamHandlers = {
  onMeta?: (meta: { sessionId: number; sessionTitle: string; userMessageId: number }) => void;
  onStatus?: (content: string) => void;
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

/** SSE 流式发送（fetch + ReadableStream，便于带 Authorization） */
export async function streamAdminAiMessage(
  sessionId: number,
  content: string,
  handlers: AdminAiStreamHandlers = {},
) {
  const token = getToken();
  const res = await fetch(`${API_BASE}/api/admin/ai/sessions/${sessionId}/messages/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      content,
      context: { path: "/admin/ai-chat", pageType: "admin_test" },
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
        };
        if (evt.type === "meta" && evt.sessionId != null && evt.userMessageId != null) {
          handlers.onMeta?.({
            sessionId: evt.sessionId,
            sessionTitle: evt.sessionTitle ?? "新对话",
            userMessageId: evt.userMessageId,
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
        /* ignore malformed chunk */
      }
    }
  }
}


