"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AdminShell from "@/components/AdminShell";
import {
  createAdminAiSession,
  deleteAdminAiSession,
  fetchAdminAiMessages,
  fetchAdminAiSessions,
  fetchMe,
  streamAdminAiMessage,
  type AdminProfile,
  type AiChatMessage,
  type AiChatSession,
} from "@/lib/api";
import { useToast } from "@/components/Toast";

function ThinkingBlock({ text, streaming }: { text: string; streaming?: boolean }) {
  const [open, setOpen] = useState(streaming ?? false);
  useEffect(() => {
    if (streaming) setOpen(true);
  }, [streaming]);
  if (!text && !streaming) return null;
  return (
    <div style={{ marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          border: "none",
          background: "transparent",
          padding: 0,
          fontSize: 12,
          color: "var(--ink-muted, #6b7280)",
          cursor: "pointer",
        }}
      >
        {streaming && !text ? "思考中…" : open ? "▾ 收起思考过程" : "▸ 展开思考过程"}
      </button>
      {open && (
        <div
          style={{
            marginTop: 6,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(0,0,0,0.04)",
            color: "var(--ink-muted, #6b7280)",
            fontSize: 12,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
          }}
        >
          {text || (streaming ? "…" : "")}
        </div>
      )}
    </div>
  );
}

export default function AdminAiChatPage() {
  const toast = useToast();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMe()
      .then(setAdmin)
      .catch(() => setAdmin(null));
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
    if (admin) loadSessions();
  }, [admin, loadSessions]);

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

  const startNew = async () => {
    try {
      const s = await createAdminAiSession();
      setSessionId(s.id);
      setMessages([]);
      setSessions((prev) => [s, ...prev]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "创建失败");
    }
  };

  const removeSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
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

      await streamAdminAiMessage(id, content, {
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
          toast.error(message);
          setMessages((m) =>
            m.map((row) =>
              row.id === tempAssistantId && !row.content
                ? { ...row, content: `（失败）${message}` }
                : row,
            ),
          );
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "发送失败");
      setMessages((m) => m.filter((row) => row.id !== tempUserId && row.id !== tempAssistantId));
    } finally {
      setSending(false);
    }
  };

  if (!admin) {
    return <div className="auth-loading">加载中…</div>;
  }

  return (
    <AdminShell admin={admin} title="AI 试聊">
      <div className="page-toolbar">
        <div>
          <h2 className="page-title">AI 试聊</h2>
        </div>
        <button type="button" className="btn-pill" onClick={startNew}>
          新对话
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, minHeight: 480 }}>
        <aside className="card card--elevated" style={{ padding: 12, overflow: "auto" }}>
          <p className="page-caption" style={{ marginTop: 0 }}>
            历史会话
          </p>
          {sessions.length === 0 ? (
            <p className="empty-block" style={{ padding: 12 }}>
              暂无
            </p>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <button
                  type="button"
                  className="btn-pill btn-pill--ghost btn-pill--sm"
                  style={{
                    flex: 1,
                    textAlign: "left",
                    opacity: s.id === sessionId ? 1 : 0.85,
                    fontWeight: s.id === sessionId ? 600 : 400,
                  }}
                  onClick={() => openSession(s.id)}
                >
                  {s.title}
                </button>
                <button
                  type="button"
                  className="ai-session-delete"
                  title="删除"
                  aria-label="删除会话"
                  onClick={(e) => removeSession(s.id, e)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                    <path d="M5 7h14M10 11v6M14 11v6M8 7l1-2h6l1 2M9 7v12a1 1 0 001 1h4a1 1 0 001-1V7" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </aside>

        <section className="card card--elevated" style={{ display: "flex", flexDirection: "column", minHeight: 480 }}>
          <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
            {messages.length === 0 ? (
              <p className="empty-block">发送一条消息开始对话。</p>
            ) : (
              messages.map((m) =>
                m.role === "status" ? (
                  <div key={m.id} style={{ marginBottom: 10, textAlign: "left" }}>
                    <div style={{ fontSize: 12, color: "var(--ink-muted, #6b7280)" }}>{m.content}</div>
                  </div>
                ) : (
                  <div
                    key={m.id}
                    style={{
                      marginBottom: 14,
                      textAlign: m.role === "user" ? "right" : "left",
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        maxWidth: "85%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        background: m.role === "user" ? "var(--shade-200)" : "var(--canvas-cream)",
                        border: "1px solid var(--hairline-light)",
                        whiteSpace: "pre-wrap",
                        textAlign: "left",
                        fontSize: 14,
                        lineHeight: 1.5,
                        minHeight: m.role === "assistant" && !m.content && sending ? 24 : undefined,
                      }}
                    >
                      {m.role === "assistant" && (m.thinking || (sending && m.id < 0)) && (
                        <ThinkingBlock
                          text={m.thinking || ""}
                          streaming={sending && m.id < 0 && !m.content}
                        />
                      )}
                      {m.content || (m.role === "assistant" && sending ? "…" : "")}
                    </div>
                  </div>
                ),
              )
            )}
            <div ref={bottomRef} />
          </div>
          <form
            onSubmit={send}
            style={{
              display: "flex",
              gap: 8,
              padding: 12,
              borderTop: "1px solid var(--hairline-light)",
            }}
          >
            <input
              className="text-input"
              style={{ flex: 1 }}
              placeholder="输入测试问题…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button type="submit" className="btn-pill" disabled={sending}>
              {sending ? "…" : "发送"}
            </button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}
