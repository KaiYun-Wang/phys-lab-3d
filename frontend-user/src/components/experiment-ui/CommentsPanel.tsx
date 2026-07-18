"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  createComment,
  deleteComment,
  fetchComments,
  fetchMe,
  likeComment,
  unlikeComment,
  type Comment,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";

type Filter = "all" | "mine";

function avatarSrc(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url}`;
}

function initials(name: string | null | undefined) {
  const s = (name || "?").trim();
  return s.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const sec = Math.floor((Date.now() - t) / 1000);
  if (sec < 60) return "刚刚";
  if (sec < 3600) return `${Math.floor(sec / 60)} 分钟前`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} 小时前`;
  if (sec < 86400 * 30) return `${Math.floor(sec / 86400)} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function CommentsPanel({
  experimentId,
  onCountChange,
}: {
  experimentId: number;
  onCountChange?: (n: number) => void;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);
  const loggedIn = isAuthenticated();

  useEffect(() => {
    if (!loggedIn) return;
    fetchMe()
      .then((u) => setMyId(u.id))
      .catch(() => setMyId(null));
  }, [loggedIn]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchComments(experimentId, { filter, page: 1, size: 50 });
      setComments(data.records ?? []);
    } catch (err) {
      setComments([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [experimentId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const requireLogin = () => {
    router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
  };

  const bumpCount = (delta: number) => {
    onCountChange?.(delta);
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    if (!loggedIn) {
      requireLogin();
      return;
    }
    setSending(true);
    try {
      await createComment(experimentId, {
        content,
        replyToId: replyTo?.id ?? null,
      });
      setDraft("");
      setReplyTo(null);
      bumpCount(1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "发送失败");
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (c: Comment) => {
    if (!loggedIn) {
      requireLogin();
      return;
    }
    const liked = !!c.liked;
    setComments((prev) => prev.map((item) => patchLike(item, c.id, !liked)));
    try {
      if (liked) await unlikeComment(experimentId, c.id);
      else await likeComment(experimentId, c.id);
    } catch {
      setComments((prev) => prev.map((item) => patchLike(item, c.id, liked)));
    }
  };

  const handleDelete = async (c: Comment) => {
    if (!loggedIn) return;
    const isRoot = c.rootId == null;
    const removed = 1 + (isRoot ? (c.replies?.length ?? 0) : 0);
    try {
      await deleteComment(experimentId, c.id);
      bumpCount(-removed);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <div className="exp-comments">
      <div className="exp-comments-tabs">
        {(
          [
            ["all", "全部"],
            ["mine", "我的"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`exp-tab${filter === id ? " active" : ""}`}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="exp-comments-list">
        {loading ? (
          <p className="exp-comments-empty">加载中…</p>
        ) : error ? (
          <p className="exp-comments-empty">{error}</p>
        ) : comments.length === 0 ? (
          <p className="exp-comments-empty">暂无评论，来抢沙发吧</p>
        ) : (
          comments.map((c) => (
            <Thread
              key={c.id}
              comment={c}
              myId={myId}
              onReply={setReplyTo}
              onLike={handleLike}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      <div className="exp-composer">
        {replyTo && (
          <div className="exp-reply-hint">
            回复 @{replyTo.nickname || "用户"}
            <button type="button" onClick={() => setReplyTo(null)}>
              取消
            </button>
          </div>
        )}
        <div className="exp-composer-box">
          <textarea
            rows={3}
            value={draft}
            placeholder={loggedIn ? "写下你的想法、提问或建议…" : "登录后即可评论…"}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
            maxLength={1000}
          />
          <div className="exp-composer-foot">
            <span className="exp-composer-hint">Ctrl + Enter 发送</span>
            <button
              type="button"
              className="exp-btn-send"
              disabled={!draft.trim() || sending}
              onClick={handleSend}
            >
              {sending ? "…" : "发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function patchLike(item: Comment, id: number, liked: boolean): Comment {
  if (item.id === id) {
    return {
      ...item,
      liked,
      likeCount: Math.max(0, (item.likeCount ?? 0) + (liked ? 1 : -1)),
    };
  }
  return {
    ...item,
    replies: item.replies?.map((r) => patchLike(r, id, liked)),
  };
}

function Thread({
  comment,
  myId,
  onReply,
  onLike,
  onDelete,
  isReply,
}: {
  comment: Comment;
  myId: number | null;
  onReply: (c: Comment) => void;
  onLike: (c: Comment) => void;
  onDelete: (c: Comment) => void;
  isReply?: boolean;
}) {
  const src = avatarSrc(comment.avatarUrl);
  const canDelete = myId != null && comment.userId === myId;
  return (
    <article className={`exp-thread${isReply ? " reply" : ""}`}>
      <div className="exp-thread-head">
        <div className="exp-avatar">
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" />
          ) : (
            initials(comment.nickname)
          )}
        </div>
        <div className="exp-who">
          <div className="name">{comment.nickname || "用户"}</div>
          <div className="time">{timeAgo(comment.createTime)}</div>
        </div>
      </div>
      <p className="exp-thread-body">
        {comment.replyToNickname ? (
          <span className="exp-reply-at">@{comment.replyToNickname} </span>
        ) : null}
        {comment.content}
      </p>
      <div className="exp-thread-actions">
        <button type="button" onClick={() => onReply(comment)}>
          回复
        </button>
        <button type="button" onClick={() => onLike(comment)}>
          {comment.liked ? "已赞" : "有帮助"} · {comment.likeCount ?? 0}
        </button>
        {canDelete && (
          <button type="button" onClick={() => onDelete(comment)}>
            删除
          </button>
        )}
      </div>
      {!isReply && (comment.replies?.length ?? 0) > 0 && (
        <div className="exp-replies">
          {comment.replies!.map((r) => (
            <Thread
              key={r.id}
              comment={r}
              myId={myId}
              isReply
              onReply={onReply}
              onLike={onLike}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </article>
  );
}
