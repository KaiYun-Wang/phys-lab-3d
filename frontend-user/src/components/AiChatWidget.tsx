"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  createAiSession,
  deleteAiSession,
  fetchAiExampleQuestions,
  fetchAiMessages,
  fetchAiSessions,
  fetchDemos,
  parseCreatedDemo,
  renameAiSession,
  streamAiMessage,
  type AiChatContext,
  type AiChatMessage,
  type AiChatSession,
  type AiExampleQuestion,
  type DemoSessionSummary,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { DemoPlanCard } from "@/components/demo/DemoPlanCard";
import { SessionHistoryItem } from "@/components/SessionHistoryItem";

const PANEL_W_KEY = "physlab.ai.panel.w";
const PANEL_H_KEY = "physlab.ai.panel.h";
/** 悬浮球引导气泡只看一次 */
const AI_TIP_KEY = "physlab.ai.tipSeen";
const DEFAULT_W = 380;
const DEFAULT_H = 560;
const MIN_W = 300;
const MIN_H = 360;

function pageContext(pathname: string): { label: string; context: AiChatContext } {
  if (pathname.startsWith("/experiments/")) {
    const route = pathname.split("/")[2] ?? "";
    const titleMap: Record<string, string> = {
      "double-slit": "双缝干涉",
      doppler: "多普勒效应",
      "wave-mechanics": "波动力学",
      "special-relativity": "狭义相对论",
      "general-relativity": "广义相对论",
      "bernoulli-venturi": "伯努利文丘里",
    };
    const title = titleMap[route] ?? route;
    return {
      label: title ? `实验 · ${title}` : "实验页",
      context: {
        path: pathname,
        pageType: "experiment",
        experimentTitle: title || undefined,
        experimentRoute: route || undefined,
      },
    };
  }
  if (pathname.startsWith("/profile")) {
    return { label: "个人中心", context: { path: pathname, pageType: "profile" } };
  }
  if (pathname === "/" || pathname === "") {
    return { label: "首页 · 实验列表", context: { path: "/", pageType: "home" } };
  }
  return { label: pathname, context: { path: pathname, pageType: "other" } };
}

function CollapsibleStep({
  label,
  detail,
  streaming,
}: {
  label: string;
  detail?: string;
  streaming?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const body = (detail ?? "").trim();
  const canOpen = body.length > 0;
  const showBody = canOpen && (open || !!streaming);
  if (!label && !streaming && !canOpen) return null;
  return (
    <div className="ai-step">
      <button
        type="button"
        className="ai-step-toggle"
        onClick={() => canOpen && setOpen((v) => !v)}
        aria-expanded={showBody}
        disabled={!canOpen}
      >
        <span className="ai-step-chevron">{canOpen ? (showBody ? "▾" : "▸") : "·"}</span>
        {streaming && !body ? "思考中…" : label}
      </button>
      {showBody && <div className="ai-step-body">{body}</div>}
    </div>
  );
}

function toolStepLabel(role: "tool_call" | "tool_result", content: string, context?: Record<string, unknown> | null) {
  if (role === "tool_call") return content || "调用工具";
  const name = context?.name;
  if (typeof name === "string" && name) {
    const map: Record<string, string> = {
      listPublishedExperiments: "查询已发布实验",
      listKnowledgePages: "查询知识页目录",
      getKnowledgePageContents: "读取知识页正文",
      createDemo: "生成演示计划",
      lookupDemo: "查询演示剧本",
    };
    return `工具结果：${map[name] ?? name}`;
  }
  return "工具结果";
}

function toolStepDetail(role: "tool_call" | "tool_result", content: string, context?: Record<string, unknown> | null) {
  if (role === "tool_result") return content;
  const args = context?.arguments;
  if (typeof args === "string" && args.trim()) return args;
  if (args != null) {
    try {
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  }
  return content;
}

function timeLabel(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

function readSize(key: string, fallback: number) {
  if (typeof window === "undefined") return fallback;
  const n = parseFloat(localStorage.getItem(key) || "");
  return Number.isFinite(n) ? n : fallback;
}

function maxPanelW() {
  if (typeof window === "undefined") return 640;
  const root = getComputedStyle(document.documentElement);
  const dockL = parseFloat(root.getPropertyValue("--ai-dock-left")) || 0;
  const dockR = parseFloat(root.getPropertyValue("--ai-dock-right")) || 0;
  return Math.max(MIN_W, Math.floor(window.innerWidth - dockL - dockR - 48));
}

function maxPanelH() {
  if (typeof window === "undefined") return 800;
  return Math.max(MIN_H, Math.floor(window.innerHeight - 48));
}

function clampPanel(w: number, h: number) {
  return {
    w: Math.max(MIN_W, Math.min(maxPanelW(), w)),
    h: Math.max(MIN_H, Math.min(maxPanelH(), h)),
  };
}

type ResizeMode = "w" | "h" | "both" | null;

export type AiChatWidgetProps = {
  /** fab = 首页气泡；rail = 实验页右栏内嵌 */
  mode?: "fab" | "rail";
  open?: boolean;
  onClose?: () => void;
  contextOverride?: AiChatContext;
  onOpenDemo?: (demoId: number) => void;
};

export default function AiChatWidget({
  mode = "fab",
  open: openProp,
  onClose,
  contextOverride,
  onOpenDemo,
}: AiChatWidgetProps = {}) {
  const pathname = usePathname();
  const isRail = mode === "rail";
  const onExperimentPage = (pathname || "").startsWith("/experiments/");

  const [openInternal, setOpenInternal] = useState(false);
  const open = isRail ? openProp !== false : openInternal;
  const setOpen = (v: boolean) => {
    if (isRail) {
      if (!v) onClose?.();
    } else {
      setOpenInternal(v);
    }
  };

  const [historyOpen, setHistoryOpen] = useState(false);
  /** 悬浮球旁的一次性引导气泡：看过一次就不再出现 */
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    try {
      setShowTip(localStorage.getItem(AI_TIP_KEY) !== "1");
    } catch {
      setShowTip(false);
    }
  }, []);  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [examples, setExamples] = useState<AiExampleQuestion[]>([]);
  const [draft, setDraft] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [demos, setDemos] = useState<DemoSessionSummary[]>([]);
  const [refIds, setRefIds] = useState<number[]>([]);
  const [refMenuOpen, setRefMenuOpen] = useState(false);
  const [refQuery, setRefQuery] = useState("");
  const [panelW, setPanelW] = useState(DEFAULT_W);
  const [panelH, setPanelH] = useState(DEFAULT_H);
  const [resizing, setResizing] = useState<ResizeMode>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const sizeRef = useRef({ w: DEFAULT_W, h: DEFAULT_H });
  const loggedIn = isAuthenticated();

  const page = pageContext(pathname || "/");
  const context = useMemo(
    () => ({
      ...page.context,
      ...contextOverride,
      ...(refIds.length ? { referencedDemoIds: refIds } : {}),
    }),
    [page.context, contextOverride, refIds],
  );
  const hideOnLogin = pathname === "/login";
  const experimentId = context.experimentId;
  /** 遥测快照转为可渲染条目 */
  const telemetryEntries = useMemo(
    () => Object.entries(contextOverride?.telemetry ?? {}),
    [contextOverride?.telemetry],
  );
  const canRefDemos = isRail && experimentId != null;
  // rail 必须等实验 id 到位，否则会误用首页（null）作用域
  const scopeReady = !isRail || experimentId != null;

  useEffect(() => {
    if (isRail) return;
    const next = clampPanel(readSize(PANEL_W_KEY, DEFAULT_W), readSize(PANEL_H_KEY, DEFAULT_H));
    setPanelW(next.w);
    setPanelH(next.h);
    sizeRef.current = next;
  }, [isRail]);

  const scrollBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadMessages = useCallback(async (id: number) => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchAiMessages(id, { limit: 50 });
      setMessages(rows);
      setSessionId(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSessionList = useCallback(async () => {
    if (!loggedIn || !scopeReady) return [] as AiChatSession[];
    try {
      const pageRes = await fetchAiSessions(1, 50, experimentId ?? null);
      const rows = pageRes.records ?? [];
      setSessions(rows);
      return rows;
    } catch {
      return [] as AiChatSession[];
    }
  }, [loggedIn, scopeReady, experimentId]);

  const loadDemos = useCallback(async () => {
    if (!canRefDemos || experimentId == null) {
      setDemos([]);
      return;
    }
    try {
      setDemos(await fetchDemos(experimentId));
    } catch {
      setDemos([]);
    }
  }, [canRefDemos, experimentId]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    if (!scopeReady) throw new Error("实验信息加载中，请稍后");
    const s = await createAiSession(experimentId ?? null);
    setSessionId(s.id);
    setSessions((prev) => [s, ...prev.filter((x) => x.id !== s.id)]);
    return s.id;
  }, [sessionId, scopeReady, experimentId]);

  // 每次打开对话 / 切换实验作用域：进入最近一条；无历史则空着
  useEffect(() => {
    if (!open || !loggedIn || !scopeReady) return;
    let cancelled = false;
    void (async () => {
      const rows = await refreshSessionList();
      if (cancelled) return;
      if (rows[0]) await loadMessages(rows[0].id);
      else {
        setSessionId(null);
        setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, loggedIn, scopeReady, experimentId, refreshSessionList, loadMessages]);

  useEffect(() => {
    if (open && canRefDemos) void loadDemos();
  }, [open, canRefDemos, loadDemos]);

  useEffect(() => {
    if (!open || examples.length > 0) return;
    fetchAiExampleQuestions()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, [open, examples.length]);

  useEffect(() => {
    scrollBottom();
  }, [messages, open, scrollBottom]);

  const toggleRef = (id: number) => {
    setRefIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openRefMenu = () => {
    setRefMenuOpen(true);
    void loadDemos();
  };

  const toggleRefMenu = () => {
    setRefMenuOpen((v) => {
      if (!v) void loadDemos();
      else setRefQuery("");
      return !v;
    });
  };

  // 侧栏窄：外面最多露 1 个标签，其余进下拉看勾选
  const REF_TAG_VISIBLE = 1;
  const refTags = useMemo(() => {
    return refIds.map((id) => {
      const hit = demos.find((d) => d.id === id);
      return hit ?? ({ id, title: "未命名演示", currentStep: 0 } as DemoSessionSummary);
    });
  }, [demos, refIds]);
  const visibleRefTags = refTags.slice(0, REF_TAG_VISIBLE);
  const hiddenRefCount = Math.max(0, refIds.length - visibleRefTags.length);
  const filteredDemos = useMemo(() => {
    const q = refQuery.trim().toLowerCase();
    if (!q) return demos;
    return demos.filter((d) => (d.title || "").toLowerCase().includes(q));
  }, [demos, refQuery]);

  const onResizePointerDown = (modeR: Exclude<ResizeMode, null>) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: panelW,
      startH: panelH,
    };
    setResizing(modeR);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!resizing || isRail) return;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const nextW = resizing === "h" ? dragRef.current.startW : dragRef.current.startW - dx;
      const nextH = resizing === "w" ? dragRef.current.startH : dragRef.current.startH - dy;
      const clamped = clampPanel(nextW, nextH);
      sizeRef.current = clamped;
      setPanelW(clamped.w);
      setPanelH(clamped.h);
    };
    const onUp = () => {
      const c = clampPanel(sizeRef.current.w, sizeRef.current.h);
      sizeRef.current = c;
      setPanelW(c.w);
      setPanelH(c.h);
      localStorage.setItem(PANEL_W_KEY, String(c.w));
      localStorage.setItem(PANEL_H_KEY, String(c.h));
      setResizing(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [resizing, isRail]);

  // ponytail: 空草稿只活在前端；落库交给 ensureSession（首条消息时）
  const startNew = () => {
    if (!loggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname || "/")}`;
      return;
    }
    if (!scopeReady) {
      setError("实验信息加载中，请稍后");
      return;
    }
    setError("");
    setHistoryOpen(false);
    if (sessionId == null && messages.length === 0) return;
    setSessionId(null);
    setMessages([]);
  };

  const removeSession = async (id: number) => {
    setError("");
    try {
      await deleteAiSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "删除失败");
    }
  };

  const renameSession = async (id: number, title: string) => {
    setError("");
    try {
      const updated = await renameAiSession(id, title);
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "重命名失败");
      throw e;
    }
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    if (content.length > 5000) {
      setError("消息不能超过 5000 字符");
      return;
    }
    if (!loggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname || "/")}`;
      return;
    }
    setSending(true);
    setError("");
    setDraft("");

    const tempUserId = -Date.now();
    const tempAssistantId = tempUserId - 1;
    setMessages((m) => [
      ...m,
      {
        id: tempUserId,
        sessionId: sessionId ?? 0,
        role: "user",
        content,
        createTime: new Date().toISOString(),
      },
      {
        id: tempAssistantId,
        sessionId: sessionId ?? 0,
        role: "assistant",
        content: "",
        thinking: "",
        createTime: new Date().toISOString(),
      },
    ]);

    try {
      const id = await ensureSession();
      await streamAiMessage(
        id,
        content,
        context,
        {
          onMeta: (meta) => {
            setSessionId(meta.sessionId);
            setMessages((m) =>
              m.map((row) =>
                row.id === tempUserId
                  ? { ...row, id: meta.userMessageId, sessionId: meta.sessionId }
                  : row.id === tempAssistantId
                    ? { ...row, sessionId: meta.sessionId }
                    : row,
              ),
            );
            setSessions((prev) => {
              const rest = prev.filter((s) => s.id !== meta.sessionId);
              return [
                {
                  id: meta.sessionId,
                  title: meta.sessionTitle,
                  createTime: new Date().toISOString(),
                  updateTime: new Date().toISOString(),
                },
                ...rest,
              ];
            });
          },
          onStatus: (textStatus) => {
            setMessages((m) => {
              const assistantIdx = m.findIndex((row) => row.id === tempAssistantId);
              const statusMsg: AiChatMessage = {
                id: -Date.now() - Math.floor(Math.random() * 1000),
                sessionId: sessionId ?? 0,
                role: "status",
                content: textStatus,
                createTime: new Date().toISOString(),
              };
              if (assistantIdx < 0) return [...m, statusMsg];
              const next = [...m];
              next.splice(assistantIdx, 0, statusMsg);
              return next;
            });
          },
          onMessage: (msg) => {
            setMessages((m) => {
              let next = [...m];
              if (msg.role === "thinking") {
                next = next.map((row) =>
                  row.id === tempAssistantId ? { ...row, thinking: "" } : row,
                );
              }
              if (next.some((row) => row.id === msg.id)) return next;
              const assistantIdx = next.findIndex((row) => row.id === tempAssistantId);
              if (assistantIdx < 0) return [...next, msg];
              next.splice(assistantIdx, 0, msg);
              return next;
            });
          },
          onClear: () => {
            setMessages((m) =>
              m.map((row) =>
                row.id === tempAssistantId ? { ...row, content: "", thinking: "" } : row,
              ),
            );
          },
          onThinking: (chunk) => {
            setMessages((m) =>
              m.map((row) =>
                row.id === tempAssistantId
                  ? { ...row, thinking: (row.thinking || "") + chunk }
                  : row,
              ),
            );
          },
          onDelta: (chunk) => {
            setMessages((m) =>
              m.map((row) =>
                row.id === tempAssistantId ? { ...row, content: row.content + chunk } : row,
              ),
            );
          },
          onDone: (done) => {
            setMessages((m) =>
              m.map((row) =>
                row.id === tempAssistantId
                  ? {
                      ...row,
                      id: done.assistantMessageId,
                      sessionId: done.sessionId,
                      thinking: "",
                    }
                  : row,
              ),
            );
            setSessions((prev) => {
              const rest = prev.filter((s) => s.id !== done.sessionId);
              return [
                {
                  id: done.sessionId,
                  title: done.sessionTitle,
                  createTime: new Date().toISOString(),
                  updateTime: new Date().toISOString(),
                },
                ...rest,
              ];
            });
          },
          onError: (message) => {
            setError(message);
          },
        },
        { enableThinking },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
      setMessages((m) => m.filter((row) => row.id !== tempUserId && row.id !== tempAssistantId));
    } finally {
      setSending(false);
      if (canRefDemos) void loadDemos();
    }
  };

  // 实验页全局气泡关闭：只保留右栏入口
  if (!isRail && (hideOnLogin || onExperimentPage)) return null;
  if (isRail && openProp === false) return null;

  const placeholder = isRail ? "" : loggedIn ? "问点什么…" : "登录后开始对话…";

  return (
    <>
      {!isRail && (
        <>
          <button
            type="button"
            className={`ai-fab${open ? " is-hidden" : ""}`}
            aria-label="打开 AI 助手"
            onClick={() => {
              setOpen(true);
              setShowTip(false);
              try {
                localStorage.setItem(AI_TIP_KEY, "1");
              } catch {
                /* 隐私模式下忽略 */
              }
            }}
          >
            <span className="ai-fab__inner">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="12.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
                <circle cx="16" cy="11" r="0.9" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="ai-fab__ring" aria-hidden />
          </button>

          {showTip && loggedIn && !open && (
            <span className="ai-fab-tip" aria-hidden>
              <span className="ai-fab-tip__ping" />
              <span className="ai-fab-tip__text">解答任何物理推导与实验参数疑难</span>
              <span className="ai-fab-tip__tag">PHY-GPT</span>
            </span>
          )}
        </>
      )}

      <div
        className={`ai-panel${open || isRail ? " is-open" : ""}${historyOpen ? " history-open" : ""}${
          resizing ? " is-resizing" : ""
        }${isRail ? " ai-panel--rail" : ""}`}
        role="dialog"
        aria-label="PhysLab AI 助手"
        aria-hidden={!open && !isRail}
        style={isRail ? undefined : { width: panelW, height: panelH }}
      >
        {/* 实验页：已挂载的实时遥测上下文 */}
        {isRail && telemetryEntries.length > 0 && (
          <div className="ai-telemetry">
            <span className="ai-telemetry__dot" aria-hidden />
            <span className="ai-telemetry__label">已挂载实时遥测</span>
            <span className="ai-telemetry__values">
              {telemetryEntries.map(([k, v]) => (
                <span key={k} className="ai-telemetry__chip">
                  {k}=<b>{v}</b>
                </span>
              ))}
            </span>
            <button
              type="button"
              className="ai-telemetry__quote"
              title="把当前工况写进输入框"
              onClick={() => {
                const line = `当前工况：${telemetryEntries
                  .map(([k, v]) => `${k}=${v}`)
                  .join("，")}。请结合该工况`;
                setDraft((d) => (d.trim() ? `${d}\n${line}` : line));
              }}
            >
              引用数据
            </button>
          </div>
        )}
        {!isRail && (
          <>
            <div className="ai-resize ai-resize--w" title="拖动调整宽度" onPointerDown={onResizePointerDown("w")} />
            <div className="ai-resize ai-resize--h" title="拖动调整高度" onPointerDown={onResizePointerDown("h")} />
            <div
              className="ai-resize ai-resize--corner"
              title="拖动调整大小"
              onPointerDown={onResizePointerDown("both")}
            />
          </>
        )}

        <header className="ai-panel-header">
          <div className="ai-avatar" aria-hidden>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 10.5h.01M14.5 10.5h.01" />
              <path d="M8.5 14.5c1.2 1.2 2.7 1.8 3.5 1.8s2.3-.6 3.5-1.8" />
            </svg>
          </div>
          <div className="ai-meta">
            <div className="ai-title">实验助手</div>
          </div>
          <button
            type="button"
            className={`ai-icon-btn${historyOpen ? " is-active" : ""}`}
            title="历史记录"
            aria-label="历史记录"
            onClick={() => {
              setHistoryOpen((v) => !v);
              if (!historyOpen) void refreshSessionList();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
          <button type="button" className="ai-icon-btn" title="新对话" aria-label="新对话" onClick={startNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          {!isRail && (
            <button
              type="button"
              className="ai-icon-btn"
              title="关闭"
              aria-label="关闭"
              onClick={() => {
                setHistoryOpen(false);
                setOpen(false);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          )}
        </header>

        <div className="ai-panel-body">
          <aside className="ai-history" aria-hidden={!historyOpen}>
            <div className="ai-history-head">
              <h3>历史对话</h3>
              <button type="button" className="ai-icon-btn" aria-label="返回对话" onClick={() => setHistoryOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M15 6l-6 6 6 6" />
                </svg>
              </button>
            </div>
            <div className="ai-history-list">
              {sessions.length === 0 ? (
                <p className="ai-history-empty">暂无历史对话。发送第一条消息后会出现在这里。</p>
              ) : (
                sessions.map((s) => (
                  <SessionHistoryItem
                    key={s.id}
                    title={s.title}
                    active={s.id === sessionId}
                    onOpen={() => {
                      void loadMessages(s.id);
                      setHistoryOpen(false);
                    }}
                    onRename={(title) => renameSession(s.id, title)}
                    onDelete={() => removeSession(s.id)}
                  />
                ))
              )}
            </div>
          </aside>

          <div className="ai-chat-view">
            <div className="ai-messages" ref={listRef}>
              {messages.length === 0 && !loading && (
                <div className="msg assistant">
                  <div className="bubble">
                    {isRail
                      ? "你好，我是实验助手。可以问实验相关问题，也可以让我生成演示讲解。"
                      : "你好，我是 PhysLab 实验助手。可以问我实验原理、操作建议，或让我根据你当前所在页面解答。"}
                  </div>
                  {!isRail && examples.length > 0 && (
                    <div className="ai-examples">
                      <span className="ai-examples__label">试试这些问题</span>
                      <div className="ai-examples__list">
                        {examples.map((ex) => (
                          <button
                            key={ex.id}
                            type="button"
                            className="ai-example-card"
                            disabled={sending}
                            onClick={() => send(ex.question)}
                          >
                            <span className="ai-example-card__title">{ex.title}</span>
                            {ex.description ? (
                              <span className="ai-example-card__desc">{ex.description}</span>
                            ) : null}
                            <span className="ai-example-card__q">{ex.question}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {messages.map((m) => {
                if (m.role === "status") {
                  return (
                    <div key={m.id} className="msg status">
                      <div className="status-line">{m.content}</div>
                    </div>
                  );
                }
                if (m.role === "tool_call" || m.role === "tool_result") {
                  const created =
                    m.role === "tool_result" && m.context?.name === "createDemo"
                      ? parseCreatedDemo(m.content)
                      : m.role === "tool_result"
                        ? parseCreatedDemo(m.content)
                        : null;
                  return (
                    <div key={m.id} className="msg status">
                      <CollapsibleStep
                        label={toolStepLabel(m.role, m.content, m.context)}
                        detail={toolStepDetail(m.role, m.content, m.context)}
                      />
                      {created && onOpenDemo && (
                        <DemoPlanCard
                          demoId={created.id}
                          title={created.title}
                          overview={created.overview}
                          steps={created.steps}
                          onStart={onOpenDemo}
                        />
                      )}
                    </div>
                  );
                }
                if (m.role === "thinking") {
                  return (
                    <div key={m.id} className="msg status">
                      <CollapsibleStep label="思考过程" detail={m.content || m.thinking || ""} />
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`msg ${m.role}`}>
                    {m.role === "assistant" && (m.thinking || (enableThinking && sending && m.id < 0)) && (
                      <CollapsibleStep
                        label="思考过程"
                        detail={m.thinking || ""}
                        streaming={enableThinking && sending && m.id < 0 && !m.content}
                      />
                    )}
                    <div className={`bubble${m.role === "assistant" ? " bubble--md" : ""}`}>
                      {m.role === "assistant" ? (
                        m.content ? (
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        ) : sending && m.id < 0 ? (
                          "…"
                        ) : null
                      ) : (
                        m.content
                      )}
                    </div>
                    <span className="time">{timeLabel(m.createTime)}</span>
                  </div>
                );
              })}
              {sending && messages.every((m) => m.id >= 0) && (
                <div className="msg assistant">
                  <div className="bubble">…</div>
                </div>
              )}
            </div>

            {error && <p className="ai-error">{error}</p>}

            {canRefDemos && (
              <div className="ai-refbar">
                {visibleRefTags.map((d) => (
                  <span key={d.id} className="ai-ref-tag" title={d.title || "未命名演示"}>
                    <em>引用</em>
                    <span className="ai-ref-tag__t">{d.title || "未命名演示"}</span>
                    <button type="button" aria-label="移除引用" onClick={() => toggleRef(d.id)}>
                      ✕
                    </button>
                  </span>
                ))}
                {hiddenRefCount > 0 && (
                  <button
                    type="button"
                    className="ai-ref-more"
                    title={`还有 ${hiddenRefCount} 个引用，点击查看`}
                    onClick={openRefMenu}
                  >
                    +{hiddenRefCount}
                  </button>
                )}
                <button
                  type="button"
                  className={`ai-ref-btn${refMenuOpen ? " is-open" : ""}`}
                  onClick={toggleRefMenu}
                >
                  {refMenuOpen ? "收起 ▴" : "＋ 引用演示 ▾"}
                </button>
              </div>
            )}
            {canRefDemos && refMenuOpen && (
              <div className="ai-refwrap">
                <div className="ai-refmenu" role="listbox" aria-label="选择引用演示">
                  <div className="ai-refmenu__head">
                    <div className="ai-refmenu__title">
                      选择要引用的演示（可多选）
                      {refIds.length > 0 ? ` · 已选 ${refIds.length}` : ""}
                    </div>
                    <input
                      className="ai-refmenu__search"
                      type="search"
                      value={refQuery}
                      placeholder="搜索演示标题…"
                      onChange={(e) => setRefQuery(e.target.value)}
                    />
                  </div>
                  <div className="ai-refmenu__list">
                    {filteredDemos.length === 0 ? (
                      <p className="ai-refmenu__empty">
                        {demos.length === 0 ? "暂无演示，可先在对话里生成" : "没有匹配的演示"}
                      </p>
                    ) : (
                      filteredDemos.map((d) => {
                        const sel = refIds.includes(d.id);
                        return (
                          <button
                            key={d.id}
                            type="button"
                            className={`ai-refmenu__item${sel ? " is-sel" : ""}`}
                            onClick={() => toggleRef(d.id)}
                          >
                            <span className="ai-refmenu__ck">{sel ? "✓" : ""}</span>
                            <span className="ai-refmenu__name">{d.title || "未命名演示"}</span>
                            <small>
                              {d.currentStep}/{d.totalSteps ?? "?"} 步
                            </small>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            <form
              className="ai-composer"
              onSubmit={(e) => {
                e.preventDefault();
                setRefMenuOpen(false);
                setRefQuery("");
                send(draft);
              }}
            >
              <button
                type="button"
                className={`ai-think-toggle${enableThinking ? " is-on" : ""}`}
                aria-pressed={enableThinking}
                title={enableThinking ? "已开启思考过程" : "点击开启思考过程"}
                disabled={sending}
                onClick={() => setEnableThinking((v) => !v)}
              >
                思考
              </button>
              <textarea
                rows={1}
                value={draft}
                placeholder={placeholder}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
              />
              <button type="submit" className="send" aria-label="发送" disabled={sending}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
