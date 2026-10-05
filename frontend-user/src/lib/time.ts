/**
 * 对话时间统一展示规则（精确到分）：
 * - 今天：`14:32`
 * - 昨天：`昨天 14:32`
 * - 前天：`前天 14:32`
 * - 同年更早：`3月5日 14:32`
 * - 跨年：`2025年12月31日 14:32`
 *
 * 用于 AI 消息时间戳、会话历史条目、个人中心最近对话等一切对话相关时间。
 */
export function formatChatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  const now = new Date();
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dayDiff = Math.round((dayStart(now) - dayStart(d)) / 86_400_000);

  if (dayDiff <= 0) return hm;
  if (dayDiff === 1) return `昨天 ${hm}`;
  if (dayDiff === 2) return `前天 ${hm}`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
}
