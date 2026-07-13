import { MetadataRoute } from "next";
import { API_BASE } from "@/lib/api";
import { getAllExperimentIds } from "@/experiments/registry";

const SITE_URL = "https://sciencelab-two.vercel.app";

type ExperimentRoute = { route: string };

async function fetchPublishedRoutes(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/experiments`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error("fetch failed");
    const data = (await res.json()) as ExperimentRoute[];
    return data.map((exp) => exp.route);
  } catch {
    return getAllExperimentIds();
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes = await fetchPublishedRoutes();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
  ];

  const experimentRoutes: MetadataRoute.Sitemap = routes.flatMap((route) => [
    {
      url: `${SITE_URL}/experiments/${route}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/experiments/${route}/details`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
  ]);

  return [...staticRoutes, ...experimentRoutes];
}
