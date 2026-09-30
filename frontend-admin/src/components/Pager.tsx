"use client";

function pageItems(current: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("...");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push("...");
  items.push(totalPages);
  return items;
}

type PagerProps = {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  /** jump：数据量少，显示页码可直接跳转；step：数据量大，逐页翻阅 */
  variant?: "jump" | "step";
};

export default function Pager({ page, total, pageSize, onChange, variant = "step" }: PagerProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="table-pager">
      <span className="caption">
        共 {total} 条 · 第 {page} / {totalPages} 页
      </span>
      <div className="table-pager__pages">
        <button
          type="button"
          className="btn-pill btn-pill--outline btn-pill--sm"
          disabled={page <= 1}
          onClick={() => onChange(Math.max(1, page - 1))}
        >
          上一页
        </button>
        {variant === "jump"
          ? pageItems(page, totalPages).map((item, index) =>
              item === "..." ? (
                <span key={`gap-${index}`} className="table-pager__gap">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`btn-pill btn-pill--sm table-pager__num${
                    item === page ? " btn-pill--primary" : " btn-pill--outline"
                  }`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => onChange(item)}
                >
                  {item}
                </button>
              ),
            )
          : null}
        <button
          type="button"
          className="btn-pill btn-pill--outline btn-pill--sm"
          disabled={page >= totalPages}
          onClick={() => onChange(Math.min(totalPages, page + 1))}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
