const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const USER_SITE = process.env.NEXT_PUBLIC_USER_URL ?? "http://localhost:3000";

export function resolveCoverUrl(coverUrl: string | null | undefined) {
  if (!coverUrl) return null;
  if (coverUrl.startsWith("http://") || coverUrl.startsWith("https://")) return coverUrl;
  if (coverUrl.startsWith("/api/covers/")) return `${API_BASE}${coverUrl}`;
  if (coverUrl.startsWith("/")) return `${USER_SITE}${coverUrl}`;
  return coverUrl;
}
