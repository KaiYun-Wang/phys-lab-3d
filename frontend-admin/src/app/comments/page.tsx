"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/AdminShell";
import RowDetailButton from "@/components/RowDetailButton";
import { useAdmin } from "@/components/AdminProvider";
import AdminSelect from "@/components/AdminSelect";
import DateRangePicker, { type DateRangeValue } from "@/components/DateRangePicker";
import {
  deleteAdminComment,
  fetchAdminComments,
  replyAdminComment,
  updateAdminCommentStatus,
  type AdminComment,
} from "@/lib/api";
import { formatCount, formatDateTime } from "@/lib/format";
import Pager from "@/components/Pager";
import { useToast } from "@/components/Toast";

type StatusFilter = "all" | "VISIBLE" | "HIDDEN" | "DELETED";

const PAGE_SIZE = 20;

function ownerLabel(row: AdminComment) {
  const name = row.nickname || row.username || "匿名用户";
  if (row.ownerType === 1) return `${name}（管理员）`;
  return name;
}

function usernameCell(row: AdminComment) {
  const name = row.username || "—";
  return row.ownerType === 1 ? `${name}（管理员）` : name;
}

export default function CommentsPage() {
  const toast = useToast();
  const admin = useAdmin();
  const [items, setItems] = useState<AdminComment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<DateRangeValue>({ from: "", to: "" });
  const [filters, setFilters] = useState({ keyword: "", from: "", to: "" });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replyTarget, setReplyTarget] = useState<AdminComment | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAdminComments({
        keyword: filters.keyword || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        status: statusFilter,
        page,
        size: PAGE_SIZE,
      });
      const rows = data.records ?? [];
      if (rows.length === 0 && page > 1) {
        setPage((p) => Math.max(1, p - 1));
        return;
      }
      setItems(rows);
      setTotal(data.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [filters, statusFilter, page]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function toggleStatus(row: AdminComment) {
    const next = row.status === "VISIBLE" ? "HIDDEN" : "VISIBLE";
    try {
      await updateAdminCommentStatus(row.id, next);
      toast.success(next === "HIDDEN" ? "已隐藏" : "已恢复可见");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminComment(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("评论已删除");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除失败");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  async function confirmReply() {
    if (!replyTarget) return;
    const content = replyDraft.trim();
    if (!content) {
      toast.error("请输入回复内容");
      return;
    }
    setReplying(true);
    try {
      await replyAdminComment({
        experimentId: replyTarget.experimentId,
        replyToId: replyTarget.id,
        content,
      });
      setReplyTarget(null);
      setReplyDraft("");
      toast.success("已以管理员身份回复");
      await loadList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "回复失败");
    } finally {
      setReplying(false);
    }
  }

  return (
    <AdminShell admin={admin}>
      <section className="page-toolbar">
        <div className="page-toolbar__left">
          <h2 className="page-title">评论管理</h2>
        </div>
      </section>

      <section className="card card--elevated">
        <div className="table-toolbar">
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setFilters({
                keyword: search.trim(),
                from: range.from,
                to: range.to,
              });
            }}
          >
            <input
              className="text-input search-form__input"
              type="search"
              placeholder="用户 / 昵称"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <DateRangePicker
              value={range}
              onChange={(next) => {
                setRange(next);
                setPage(1);
                setFilters((f) => ({ ...f, from: next.from, to: next.to }));
              }}
            />
            <button type="submit" className="btn-pill btn-pill--outline btn-pill--sm">
              搜索
            </button>
          </form>
          <AdminSelect
            className="table-toolbar__select"
            value={statusFilter}
            onChange={(v) => {
              setPage(1);
              setStatusFilter(v as StatusFilter);
            }}
            ariaLabel="状态筛选"
            options={[
              { value: "all", label: "全部状态" },
              { value: "VISIBLE", label: "可见" },
              { value: "HIDDEN", label: "已隐藏" },
              { value: "DELETED", label: "已删除" },
            ]}
          />
        </div>

        {error ? <p className="form-error table-message">{error}</p> : null}

        {loading ? (
          <p className="table-message caption">加载中…</p>
        ) : items.length === 0 ? (
          <div className="empty-block empty-block--compact">
            <div className="empty-block__icon">
              <i className="fa-solid fa-comments" aria-hidden />
            </div>
            <span className="heading-sm">
              暂无评论
            </span>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>序号</th>
                  <th>内容</th>
                  <th>用户名</th>
                  <th>昵称</th>
                  <th>实验</th>
                  <th>楼/回复</th>
                  <th>赞</th>
                  <th>状态</th>
                  <th>评论时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {items.map((row, i) => (
                  <tr key={row.id}>
                    <td className="data-table__num">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td className="cell-clip">{row.content}</td>
                    <td>{usernameCell(row)}</td>
                    <td>{row.nickname || "—"}</td>
                    <td>
                      {row.experimentId ? (
                        <Link href={`/experiments/${row.experimentId}/edit`}>
                          {row.experimentTitle || row.experimentId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="data-table__num">
                      {row.rootId == null ? "一级" : "回复"}
                    </td>
                    <td className="data-table__num">{formatCount(row.likeCount)}</td>
                    <td>
                      <span
                        className={`pill-tag ${
                          row.status === "VISIBLE"
                            ? "pill-tag--ok"
                            : row.status === "HIDDEN"
                              ? "pill-tag--warn"
                              : "pill-tag--danger"
                        }`}
                      >
                        {row.status === "VISIBLE" ? "可见" : row.status === "HIDDEN" ? "隐藏" : "已删"}
                      </span>
                    </td>
                    <td className="data-table__time">{formatDateTime(row.createTime)}</td>
                    <td>
                      <div className="row-actions">
                        <RowDetailButton
                          title="评论详情"
                          fields={[
                            { label: "内容", value: row.content },
                            { label: "用户", value: usernameCell(row) },
                            { label: "昵称", value: row.nickname || "—" },
                            { label: "实验", value: row.experimentTitle || row.experimentId || "—" },
                            { label: "层级", value: row.rootId == null ? "一级评论" : "回复" },
                            { label: "点赞数", value: formatCount(row.likeCount) },
                            {
                              label: "状态",
                              value:
                                row.status === "VISIBLE" ? "可见" : row.status === "HIDDEN" ? "隐藏" : "已删除",
                            },
                            { label: "评论时间", value: formatDateTime(row.createTime) },
                          ]}
                        />
                        {row.status === "VISIBLE" && (
                          <button
                            type="button"
                            className="btn-pill btn-pill--ghost btn-pill--sm"
                            onClick={() => {
                              setReplyTarget(row);
                              setReplyDraft("");
                            }}
                          >
                            回复
                          </button>
                        )}
                        {row.status !== "DELETED" && (
                          <button
                            type="button"
                            className="btn-pill btn-pill--ghost btn-pill--sm"
                            onClick={() => toggleStatus(row)}
                          >
                            {row.status === "VISIBLE" ? "隐藏" : "恢复"}
                          </button>
                        )}
                        {row.status !== "DELETED" && (
                          <button
                            type="button"
                            className="btn-pill btn-pill--ghost btn-pill--sm row-actions__danger"
                            onClick={() => setDeleteTarget(row)}
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && items.length > 0 ? (
          <Pager page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} variant="step" />
        ) : null}
      </section>

      {replyTarget ? (
        <div
          className="modal-overlay"
          role="presentation"
          onClick={() => !replying && setReplyTarget(null)}
        >
          <div
            className="modal card card--elevated"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="heading-sm">官方回复</h3>
            <p className="caption mb-12">
              回复 {ownerLabel(replyTarget)}
              <br />
              「
              {replyTarget.content.length > 80
                ? `${replyTarget.content.slice(0, 80)}…`
                : replyTarget.content}
              」
            </p>
            <textarea
              className="text-input text-input--textarea"
              rows={4}
              maxLength={1000}
              placeholder="输入官方回复内容…"
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              disabled={replying}
            />
            <div className="form-actions">
              <button
                type="button"
                className="btn-pill btn-pill--outline btn-pill--sm"
                onClick={() => setReplyTarget(null)}
                disabled={replying}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-pill btn-pill--sm"
                onClick={confirmReply}
                disabled={replying}
              >
                {replying ? "发送中…" : "发送回复"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="modal-overlay" role="presentation" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal card card--elevated" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h3 className="heading-sm">确认删除评论？</h3>
            <p className="caption">将标记为已删除，并从用户端隐藏；若为一级评论，其子回复一并处理。</p>
            <div className="form-actions">
              <button
                type="button"
                className="btn-pill btn-pill--outline btn-pill--sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn-pill btn-pill--danger btn-pill--sm"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
