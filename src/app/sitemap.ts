import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/catalogue";
import { absoluteUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { categories, videos } = await getSitemapEntries();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    {
      url: absoluteUrl("/categories"),
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    ...categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...videos.map((v) => ({
      url: absoluteUrl(`/video/${v.slug}`),
      lastModified: new Date(v.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
