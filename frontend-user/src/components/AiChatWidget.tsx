"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname } from "next/navigation";
import {
  createAiSession,
  deleteAiSession,
  fetchAiExampleQuestions,
  fetchAiMessages,
  fetchAiSessions,
  streamAiMessage,
  type AiChatContext,
  type AiChatMessage,
  type AiChatSession,
  type AiExampleQuestion,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

const PANEL_W_KEY = "physlab.ai.panel.w";
const PANEL_H_KEY = "physlab.ai.panel.h";
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

function ThinkingBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(streaming ?? false);
  useEffect(() => {
    if (streaming) setOpen(true);
  }, [streaming]);
  if (!text && !streaming) return null;
  return (
    <div className="ai-thinking">
      <button type="button" className="ai-thinking-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="ai-thinking-chevron">{open ? "▾" : "▸"}</span>
        {streaming && !text ? "思考中…" : open ? "收起思考过程" : "展开思考过程"}
      </button>
      {open && (
        <div className="ai-thinking-body">
          {text || (streaming ? "…" : "")}
        </div>
      )}
    </div>
  );
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

export default function AiChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [examples, setExamples] = useState<AiExampleQuestion[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [panelW, setPanelW] = useState(DEFAULT_W);
  const [panelH, setPanelH] = useState(DEFAULT_H);
  const [resizing, setResizing] = useState<ResizeMode>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const sizeRef = useRef({ w: DEFAULT_W, h: DEFAULT_H });
  const loggedIn = isAuthenticated();

  const { label: contextLabel, context } = pageContext(pathname || "/");
  const hideOnLogin = pathname === "/login";

  useEffect(() => {
    const next = clampPanel(readSize(PANEL_W_KEY, DEFAULT_W), readSize(PANEL_H_KEY, DEFAULT_H));
    setPanelW(next.w);
    setPanelH(next.h);
    sizeRef.current = next;
  }, []);

  const scrollBottom = useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadSessions = useCallback(async () => {
    if (!loggedIn) return;
    try {
      const page = await fetchAiSessions(1, 50);
      setSessions(page.records ?? []);
    } catch {
      /* ignore */
    }
  }, [loggedIn]);

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

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const s = await createAiSession();
    setSessionId(s.id);
    setSessions((prev) => [s, ...prev.filter((x) => x.id !== s.id)]);
    return s.id;
  }, [sessionId]);

  useEffect(() => {
    if (open && loggedIn) loadSessions();
  }, [open, loggedIn, loadSessions]);

  useEffect(() => {
    if (!open || examples.length > 0) return;
    fetchAiExampleQuestions()
      .then(setExamples)
      .catch(() => setExamples([]));
  }, [open, examples.length]);

  useEffect(() => {
    scrollBottom();
  }, [messages, open, scrollBottom]);

  const onResizePointerDown = (mode: Exclude<ResizeMode, null>) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: panelW,
      startH: panelH,
    };
    setResizing(mode);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!resizing) return;
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
  }, [resizing]);

  const startNew = async () => {
    if (!loggedIn) {
      window.location.href = `/login?redirect=${encodeURIComponent(pathname || "/")}`;
      return;
    }
    setError("");
    setHistoryOpen(false);
    try {
      const s = await createAiSession();
      setSessionId(s.id);
      setMessages([]);
      setSessions((prev) => [s, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "创建会话失败");
    }
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

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
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
      await streamAiMessage(id, content, context, {
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
        onStatus: (text) => {
          setMessages((m) => {
            const assistantIdx = m.findIndex((row) => row.id === tempAssistantId);
            const statusMsg: AiChatMessage = {
              id: -Date.now() - Math.floor(Math.random() * 1000),
              sessionId: sessionId ?? 0,
              role: "status",
              content: text,
              createTime: new Date().toISOString(),
            };
            if (assistantIdx < 0) return [...m, statusMsg];
            const next = [...m];
            next.splice(assistantIdx, 0, statusMsg);
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
                    thinking: done.thinking ?? row.thinking,
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
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败");
      setMessages((m) => m.filter((row) => row.id !== tempUserId && row.id !== tempAssistantId));
    } finally {
      setSending(false);
    }
  };

  if (hideOnLogin) return null;

  return (
    <>
      <button
        type="button"
        className={`ai-fab${open ? " is-hidden" : ""}`}
        aria-label="打开 AI 助手"
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          <circle cx="9" cy="11" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="12.5" cy="11" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="16" cy="11" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      </button>

      <div
        className={`ai-panel${open ? " is-open" : ""}${historyOpen ? " history-open" : ""}${
          resizing ? " is-resizing" : ""
        }`}
        role="dialog"
        aria-label="PhysLab AI 助手"
        aria-hidden={!open}
        style={{ width: panelW, height: panelH }}
      >
        <div className="ai-resize ai-resize--w" title="拖动调整宽度" onPointerDown={onResizePointerDown("w")} />
        <div className="ai-resize ai-resize--h" title="拖动调整高度" onPointerDown={onResizePointerDown("h")} />
        <div
          className="ai-resize ai-resize--corner"
          title="拖动调整大小"
          onPointerDown={onResizePointerDown("both")}
        />

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
            <div className="ai-sub">PhysLab AI · 可感知当前页面</div>
          </div>
          <button
            type="button"
            className={`ai-icon-btn${historyOpen ? " is-active" : ""}`}
            title="历史记录"
            aria-label="历史记录"
            onClick={() => {
              setHistoryOpen((v) => !v);
              if (!historyOpen) loadSessions();
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
                  <div
                    key={s.id}
                    className={`ai-history-row${s.id === sessionId ? " is-active" : ""}`}
                  >
                    <button
                      type="button"
                      className="ai-history-item"
                      onClick={() => {
                        loadMessages(s.id);
                        setHistoryOpen(false);
                      }}
                    >
                      <span className="htitle">{s.title}</span>
                      <span className="hmeta">{timeLabel(s.updateTime)}</span>
                    </button>
                    <button
                      type="button"
                      className="ai-history-delete"
                      title="删除"
                      aria-label="删除对话"
                      onClick={() => removeSession(s.id)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                        <path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M9 7v12a1 1 0 001 1h4a1 1 0 001-1V7" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </aside>

          <div className="ai-chat-view">
            <div className="ai-context">
              <span className="label">当前页</span>
              <span className="chip">
                <span className="dot" aria-hidden />
                <span>{contextLabel}</span>
              </span>
            </div>

            <div className="ai-messages" ref={listRef}>
              {messages.length === 0 && !loading && (
                <div className="msg assistant">
                  <div className="bubble">
                    你好，我是 PhysLab 实验助手。可以问我实验原理、操作建议，或让我根据你当前所在页面解答。
                  </div>
                  {examples.length > 0 && (
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
              {messages.map((m) =>
                m.role === "status" ? (
                  <div key={m.id} className="msg status">
                    <div className="status-line">{m.content}</div>
                  </div>
                ) : (
                  <div key={m.id} className={`msg ${m.role}`}>
                    {m.role === "assistant" && (m.thinking || (sending && m.id < 0)) && (
                      <ThinkingBlock text={m.thinking || ""} streaming={sending && m.id < 0 && !m.content} />
                    )}
                    <div className="bubble">
                      {m.content || (m.role === "assistant" && sending && m.id < 0 ? "…" : "")}
                    </div>
                    <span className="time">{timeLabel(m.createTime)}</span>
                  </div>
                ),
              )}
              {sending && messages.every((m) => m.id >= 0) && (
                <div className="msg assistant">
                  <div className="bubble">…</div>
                </div>
              )}
            </div>

            {error && <p className="ai-error">{error}</p>}

            <form
              className="ai-composer"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <textarea
                rows={1}
                value={draft}
                maxLength={4000}
                placeholder={loggedIn ? "问点什么…" : "登录后开始对话…"}
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
