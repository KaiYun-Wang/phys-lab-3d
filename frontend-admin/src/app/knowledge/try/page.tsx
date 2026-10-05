"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AdminShell from "@/components/AdminShell";
import { useAdmin } from "@/components/AdminProvider";
import {
  createAdminAiSession,
  deleteAdminAiSession,
  fetchAdminAiMessages,
  fetchAdminAiSessions,
  renameAdminAiSession,
  streamAdminAiMessage,
  type AiChatMessage,
  type AiChatSession,
} from "@/lib/api";
import { useToast } from "@/components/Toast";
import { SessionHistoryItem } from "@/components/SessionHistoryItem";

const SIDE_W_KEY = "physlab.admin.ai.side.w";
const SIDE_W_DEFAULT = 240;
const SIDE_W_MIN = 180;
const SIDE_W_MAX = 420;

function readSideW() {
  if (typeof window === "undefined") return SIDE_W_DEFAULT;
  const n = Number(localStorage.getItem(SIDE_W_KEY));
  if (!Number.isFinite(n)) return SIDE_W_DEFAULT;
  return Math.min(SIDE_W_MAX, Math.max(SIDE_W_MIN, n));
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
        className="ai-step__toggle"
        onClick={() => canOpen && setOpen((v) => !v)}
        aria-expanded={showBody}
        disabled={!canOpen}
      >
        <span className="ai-step__caret">{canOpen ? (showBody ? "▾" : "▸") : "·"}</span>
        {streaming && !body ? "思考中…" : label}
      </button>
      {showBody && <div className="ai-step__body">{body}</div>}
    </div>
  );
}

function toolStepLabel(role: "tool_call" | "tool_result", content: string, context?: Record<string, unknown> | null) {
  if (role === "tool_call") return content || "调用工具";
  const name = context?.name;
  if (typeof name === "string" && name) {
    const map: Record<string, string> = {
      listKnowledgePages: "查询知识页目录",
      getKnowledgePageContents: "读取知识页正文",
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

export default function AdminAiChatPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [enableThinking, setEnableThinking] = useState(false);
  const [sending, setSending] = useState(false);
  const [sideW, setSideW] = useState(SIDE_W_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sideDragRef = useRef({ startX: 0, startW: SIDE_W_DEFAULT });

  useEffect(() => {
    setSideW(readSideW());
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const page = await fetchAdminAiSessions(1, 30);
      setSessions(page.records ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载会话失败");
    }
  }, [toast]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openSession = async (id: number) => {
    try {
      const rows = await fetchAdminAiMessages(id);
      setSessionId(id);
      setMessages(rows);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "加载消息失败");
    }
  };

  // ponytail: 空草稿不落库；首条消息时再 createAdminAiSession
  const startNew = () => {
    if (sessionId == null && messages.length === 0) return;
    setSessionId(null);
    setMessages([]);
  };

  const removeSession = async (id: number) => {
    try {
      await deleteAdminAiSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        setSessionId(null);
        setMessages([]);
      }
      toast.success("已删除会话");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
    }
  };

  const renameSession = async (id: number, title: string) => {
    try {
      const updated = await renameAdminAiSession(id, title);
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: updated.title } : s)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "重命名失败");
      throw err;
    }
  };

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: PointerEvent) => {
      const next = Math.min(
        SIDE_W_MAX,
        Math.max(SIDE_W_MIN, sideDragRef.current.startW + (e.clientX - sideDragRef.current.startX)),
      );
      setSideW(next);
    };
    const onUp = () => {
      setResizing(false);
      setSideW((w) => {
        localStorage.setItem(SIDE_W_KEY, String(w));
        return w;
      });
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

  const onResizeDown = (e: ReactPointerEvent) => {
    e.preventDefault();
    sideDragRef.current = { startX: e.clientX, startW: sideW };
    setResizing(true);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    if (content.length > 5000) {
      toast.error("消息不能超过 5000 字符");
      return;
    }
    setSending(true);
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
      let id = sessionId;
      if (!id) {
        const s = await createAdminAiSession();
        id = s.id;
        setSessionId(id);
        setSessions((prev) => [s, ...prev]);
      }

      await streamAdminAiMessage(
        id,
        content,
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
          toast.error(message);
          setMessages((m) =>
            m.map((row) =>
              row.id === tempAssistantId && !row.content
                ? { ...row, content: `（失败）${message}` }
                : row,
            ),
          );
        },
      },
        { enableThinking },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
      setMessages((m) => m.filter((row) => row.id !== tempUserId && row.id !== tempAssistantId));
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminShell admin={admin}>
      <div className="page-toolbar">
        <div className="page-toolbar__left">
          <Link href="/knowledge" className="kb-back-link">
            ← 返回知识页
          </Link>
          <h2 className="page-title">试聊</h2>
        </div>
        <button type="button" className="btn-pill" onClick={startNew}>
          <i className="fa-solid fa-plus" aria-hidden />
          新对话
        </button>
      </div>

      <div className="ai-chat-layout" style={{ ["--ai-side-w" as string]: `${sideW}px` }}>
        <aside className="card card--elevated ai-session-aside">
          <p className="ai-aside-label">历史会话</p>
          {sessions.length === 0 ? (
            <p className="ai-empty">暂无</p>
          ) : (
            sessions.map((s) => (
              <SessionHistoryItem
                key={s.id}
                title={s.title}
                active={s.id === sessionId}
                onOpen={() => void openSession(s.id)}
                onRename={(title) => renameSession(s.id, title)}
                onDelete={() => removeSession(s.id)}
              />
            ))
          )}
        </aside>

        <div
          className={`ai-session-resize${resizing ? " is-dragging" : ""}`}
          onPointerDown={onResizeDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="调整会话栏宽度"
        />

        <section className="card card--elevated ai-chat-main">
          <div className="ai-thread">
            {messages.length === 0 ? (
              <p className="ai-empty">发送一条消息开始对话。</p>
            ) : (
              messages.map((m) =>
                m.role === "status" ? (
                  <div key={m.id} className="ai-status-line">
                    {m.content}
                  </div>
                ) : m.role === "tool_call" || m.role === "tool_result" ? (
                  <CollapsibleStep
                    key={m.id}
                    label={toolStepLabel(m.role, m.content, m.context)}
                    detail={toolStepDetail(m.role, m.content, m.context)}
                  />
                ) : m.role === "thinking" ? (
                  <CollapsibleStep key={m.id} label="思考过程" detail={m.content || m.thinking || ""} />
                ) : (
                  <div key={m.id} className={`ai-msg-row${m.role === "user" ? " ai-msg-row--user" : ""}`}>
                    <div
                      className={`ai-msg${m.role === "user" ? " ai-msg--user" : ""}${
                        m.role === "assistant" ? " ai-md" : ""
                      }${m.role === "assistant" && !m.content && sending ? " ai-msg--pending" : ""}`}
                    >
                      {m.role === "assistant" && (m.thinking || (enableThinking && sending && m.id < 0)) && (
                        <CollapsibleStep
                          label="思考过程"
                          detail={m.thinking || ""}
                          streaming={enableThinking && sending && m.id < 0 && !m.content}
                        />
                      )}
                      {m.role === "assistant" ? (
                        m.content ? (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        ) : sending ? (
                          "…"
                        ) : null
                      ) : (
                        m.content
                      )}
                    </div>
                  </div>
                ),
              )
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={send} className="ai-composer">
            <button
              type="button"
              className={`btn-pill ai-composer__toggle${enableThinking ? " is-on" : ""}`}
              aria-pressed={enableThinking}
              data-tooltip={enableThinking ? "已开启思考过程" : "点击开启思考过程"}
              disabled={sending}
              onClick={() => setEnableThinking((v) => !v)}
            >
              <i className="fa-solid fa-brain" aria-hidden />
              思考
            </button>
            <input
              className="text-input"
              placeholder="输入测试问题…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn-pill btn-pill--primary" disabled={sending}>
              {sending ? "…" : (
                <>
                  <i className="fa-solid fa-paper-plane" aria-hidden />
                  发送
                </>
              )}
            </button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}
