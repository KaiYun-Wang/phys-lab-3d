"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  API_BASE,
  addCommentReaction,
  createComment,
  deleteComment,
  fetchComments,
  fetchMe,
  removeCommentReaction,
  type Comment,
  type CommentReaction,
  type CommentSort,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { Flame, Lightbulb, Star, ThumbsUp } from "lucide-react";

type Filter = "all" | "mine";

function avatarSrc(url: string | null | undefined) {
  if (!url) return null;
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

function hasReaction(c: Comment, type: CommentReaction) {
  if (c.myReactions?.length) return c.myReactions.includes(type);
  // 回退：旧数据只有 liked 标记，语义等同 HELPFUL
  return type === "HELPFUL" && !!c.liked;
}

/** 乐观更新：切换某个反应并同步计数 */
function patchReaction(item: Comment, id: number, type: CommentReaction, on: boolean): Comment {
  if (item.id === id) {
    const current = new Set<CommentReaction>(item.myReactions ?? (item.liked ? ["HELPFUL"] : []));
    if (on) current.add(type);
    else current.delete(type);

    const helpful = item.helpfulCount ?? item.likeCount ?? 0;
    const inspire = item.inspireCount ?? 0;
    return {
      ...item,
      myReactions: [...current],
      liked: current.has("HELPFUL"),
      helpfulCount: Math.max(0, helpful + (type === "HELPFUL" ? (on ? 1 : -1) : 0)),
      inspireCount: Math.max(0, inspire + (type === "INSPIRE" ? (on ? 1 : -1) : 0)),
      likeCount: Math.max(0, helpful + (type === "HELPFUL" ? (on ? 1 : -1) : 0)),
    };
  }
  return {
    ...item,
    replies: item.replies?.map((r) => patchReaction(r, id, type, on)),
  };
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
  const [sort, setSort] = useState<CommentSort>("hot");
  const [comments, setComments] = useState<Comment[]>([]);
  const [featuredCount, setFeaturedCount] = useState(0);
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
      const data = await fetchComments(experimentId, { filter, sort, page: 1, size: 50 });
      setComments(data.records ?? []);
      setFeaturedCount(data.featuredCount ?? 0);
    } catch (err) {
      setComments([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [experimentId, filter, sort]);

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

  const handleReact = async (c: Comment, type: CommentReaction) => {
    if (!loggedIn) {
      requireLogin();
      return;
    }
    const on = !hasReaction(c, type);
    setComments((prev) => prev.map((item) => patchReaction(item, c.id, type, on)));
    try {
      if (on) await addCommentReaction(experimentId, c.id, type);
      else await removeCommentReaction(experimentId, c.id, type);
    } catch {
      setComments((prev) => prev.map((item) => patchReaction(item, c.id, type, !on)));
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
      <div className="exp-comments-sortbar">
        <div className="exp-sort-group" role="group" aria-label="排序">
          <button
            type="button"
            className={`exp-sort-btn${sort === "hot" ? " is-on" : ""}`}
            aria-pressed={sort === "hot"}
            onClick={() => setSort("hot")}
          >
            <Flame size={12} aria-hidden />
            最热
          </button>
          <button
            type="button"
            className={`exp-sort-btn${sort === "new" ? " is-on" : ""}`}
            aria-pressed={sort === "new"}
            onClick={() => setSort("new")}
          >
            最新
          </button>
        </div>

        {featuredCount > 0 && (
          <span className="exp-featured-count">
            已精选 {featuredCount} 条高质量回答
          </span>
        )}
      </div>

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
              onReact={handleReact}
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
            placeholder={
              loggedIn ? "记录实验心得、讨论推导异常或提出疑问…" : "登录后即可评论…"
            }
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
            <span className="exp-composer-hint">Ctrl + Enter 快速提交</span>
            <button
              type="button"
              className="exp-btn-send"
              disabled={!draft.trim() || sending}
              onClick={handleSend}
            >
              {sending ? "…" : "发布心得"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Thread({
  comment,
  myId,
  onReply,
  onReact,
  onDelete,
  isReply,
}: {
  comment: Comment;
  myId: number | null;
  onReply: (c: Comment) => void;
  onReact: (c: Comment, type: CommentReaction) => void;
  onDelete: (c: Comment) => void;
  isReply?: boolean;
}) {
  const src = avatarSrc(comment.avatarUrl);
  const isAdmin = comment.ownerType === 1;
  const canDelete = myId != null && comment.ownerType === 0 && comment.ownerId === myId;
  const helpful = comment.helpfulCount ?? comment.likeCount ?? 0;
  const inspire = comment.inspireCount ?? 0;

  return (
    <article
      className={`exp-thread${isReply ? " reply" : ""}${isAdmin ? " official" : ""}${
        comment.featured ? " is-featured" : ""
      }`}
    >
      <div className="exp-thread-head">
        <div className={`exp-avatar${isAdmin ? " official" : ""}`}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" />
          ) : (
            initials(comment.nickname)
          )}
        </div>
        <div className="exp-who">
          <div className="name">
            {comment.nickname || (isAdmin ? "管理员" : "用户")}
            {isAdmin ? <span className="exp-official-tag">官方</span> : null}
            {comment.featured ? (
              <span className="exp-featured-badge">
                <Star size={9} fill="currentColor" aria-hidden />
                精选
              </span>
            ) : null}
          </div>
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
        <button
          type="button"
          className={`exp-react-btn${hasReaction(comment, "HELPFUL") ? " is-on" : ""}`}
          aria-pressed={hasReaction(comment, "HELPFUL")}
          onClick={() => onReact(comment, "HELPFUL")}
        >
          <ThumbsUp size={11} aria-hidden />
          有帮助
          <span className="exp-react-count">{helpful}</span>
        </button>
        <button
          type="button"
          className={`exp-react-btn inspire${hasReaction(comment, "INSPIRE") ? " is-on" : ""}`}
          aria-pressed={hasReaction(comment, "INSPIRE")}
          onClick={() => onReact(comment, "INSPIRE")}
        >
          <Lightbulb size={11} aria-hidden />
          启发思路
          <span className="exp-react-count">{inspire}</span>
        </button>
        <button type="button" className="exp-react-reply" onClick={() => onReply(comment)}>
          回复
        </button>
        {canDelete && (
          <button type="button" className="exp-react-delete" onClick={() => onDelete(comment)}>
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
              onReact={onReact}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </article>
  );
}
