import { unstable_cache } from "next/cache";
import { cache } from "react";
import { config } from "@/lib/config";
import {
  getTopLocalClicks,
  incrementLocalClick,
} from "@/lib/clicks-store";
import { getSupabaseAnon, hasSupabaseConfig } from "@/lib/supabase/client";
import type {
  CatalogueFilters,
  Category,
  DurationFilter,
  ListingCard,
  SortOption,
  Video,
} from "@/lib/types";

// Disambiguate: videos↔categories has both category_id FK and video_categories M2M
const CATEGORY_EMBED = "categories!videos_category_id_fkey(name,slug)";
const VIDEO_CARD_SELECT =
  `id,video_id,title,slug,thumbnail_url,duration_seconds,views,destination_url,category_id,${CATEGORY_EMBED}`;

function embedOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function emptyResult(page: number, pageSize: number) {
  return {
    items: [] as ListingCard[],
    total: 0,
    page,
    pageSize,
    totalPages: 1,
  };
}

function mapVideo(
  row: Video & {
    categories?: Category | Category[] | null;
    destination_url?: string;
  },
): ListingCard {
  const categoryRel = Array.isArray(row.categories)
    ? row.categories[0]
    : row.categories;
  return {
    id: row.id,
    video_id: row.video_id,
    title: row.title,
    slug: row.slug,
    thumbnailUrl: row.thumbnail_url,
    durationSeconds: row.duration_seconds,
    views: Number(row.views || 0),
    category: {
      name: categoryRel?.name || "Uncategorized",
      slug: categoryRel?.slug || "uncategorized",
    },
  };
}

function durationBounds(duration?: DurationFilter) {
  switch (duration) {
    case "under5":
      return { gte: 0, lt: 300 };
    case "5to10":
      return { gte: 300, lt: 600 };
    case "10to20":
      return { gte: 600, lt: 1200 };
    case "20plus":
      return { gte: 1200, lt: null };
    default:
      return null;
  }
}

function sortColumn(sort: SortOption = "newest") {
  switch (sort) {
    case "oldest":
      return { column: "created_at", ascending: true };
    case "views":
      return { column: "views", ascending: false };
    case "shortest":
      return { column: "duration_seconds", ascending: true };
    case "trending":
      return { column: "click_count", ascending: false };
    case "newest":
    default:
      return { column: "created_at", ascending: false };
  }
}

function dedupeByDestination<T extends { destination_url?: string; id: string }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    const key = row.destination_url || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Lightweight list for header/nav — one query, no per-category counts. */
export const getCategoryNav = cache(async function getCategoryNav(): Promise<
  { name: string; slug: string }[]
> {
  if (!hasSupabaseConfig()) return [];
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("categories")
    .select("name,slug,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error || !data) return [];
  return data.map((c) => ({ name: c.name, slug: c.slug }));
});

function isStableThumb(url: string) {
  if (!url?.startsWith("https://")) return false;
  if (url.includes("validto=")) return false;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) return true;
  if (url.includes("ei.phncdn.com") || url.includes("di.phncdn.com")) return true;
  return false;
}

/**
 * Fast categories load: ~2–3 queries total (was 3N).
 * Cached 2 minutes across requests.
 */
async function loadCategoriesUncached(): Promise<Category[]> {
  if (!hasSupabaseConfig()) return [];
  const supabase = getSupabaseAnon();

  const [{ data, error }, coversRes] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id,name,slug,description,sort_order,is_featured,video_categories(count)",
      )
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("videos")
      .select("category_id,thumbnail_url,views")
      .order("views", { ascending: false })
      .limit(120),
  ]);

  if (error || !data) return [];

  const coverByCat = new Map<string, string>();
  for (const row of coversRes.data || []) {
    if (
      row.category_id &&
      row.thumbnail_url &&
      isStableThumb(row.thumbnail_url) &&
      !coverByCat.has(row.category_id)
    ) {
      coverByCat.set(row.category_id, row.thumbnail_url);
    }
  }

  // Fill missing covers (and exact counts when junction empty) in parallel
  const needsCover = data.filter((c) => !coverByCat.has(c.id));
  if (needsCover.length) {
    await Promise.all(
      needsCover.map(async (c) => {
        const { data: row } = await supabase
          .from("videos")
          .select("thumbnail_url")
          .eq("category_id", c.id)
          .like("thumbnail_url", "http%")
          .order("views", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (row?.thumbnail_url) coverByCat.set(c.id, row.thumbnail_url);
      }),
    );
  }

  const mapped = await Promise.all(
    data.map(async (c) => {
      const raw = c as {
        video_categories?: { count: number }[] | null;
      };
      let video_count = Number(raw.video_categories?.[0]?.count || 0);
      if (video_count === 0) {
        const { count } = await supabase
          .from("videos")
          .select("id", { count: "exact", head: true })
          .eq("category_id", c.id);
        video_count = count || 0;
      }
      return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sort_order: c.sort_order,
        is_featured: c.is_featured,
        video_count,
        image_url: coverByCat.get(c.id) || null,
      };
    }),
  );

  return mapped.filter((c) => (c.video_count ?? 0) > 0);
}

const getCachedCategories = unstable_cache(
  loadCategoriesUncached,
  ["vidora-categories-v3"],
  { revalidate: 120 },
);

export const getCategories = cache(async function getCategories(): Promise<
  Category[]
> {
  return getCachedCategories();
});

export const getCategoryBySlug = cache(async function getCategoryBySlug(
  slug: string,
) {
  if (!hasSupabaseConfig()) return null;
  const supabase = getSupabaseAnon();
  const { data } = await supabase
    .from("categories")
    .select("id,name,slug,description,sort_order,is_featured")
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

export async function queryCatalogue(filters: CatalogueFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? config.pageSize;
  if (!hasSupabaseConfig()) return emptyResult(page, pageSize);

  const supabase = getSupabaseAnon();
  let categoryId: string | undefined;
  if (filters.categorySlug) {
    const category = await getCategoryBySlug(filters.categorySlug);
    if (!category) return emptyResult(page, pageSize);
    categoryId = category.id;
  }

  if (filters.sort === "trending") {
    return queryTrending(filters, page, pageSize, categoryId);
  }

  // Category pages: prefer junction so CSV multi-category links show up
  if (categoryId) {
    const junctionProbe = await supabase
      .from("video_categories")
      .select("video_uuid", { count: "exact", head: true })
      .eq("category_id", categoryId);

    if (!junctionProbe.error && (junctionProbe.count || 0) > 0) {
      let jq = supabase
        .from("video_categories")
        .select(`videos(${VIDEO_CARD_SELECT})`, { count: "exact" })
        .eq("category_id", categoryId);

      if (filters.q?.trim()) {
        jq = jq.ilike("videos.title", `%${filters.q.trim()}%`);
      }
      const bounds = durationBounds(filters.duration);
      if (bounds) {
        jq = jq.gte("videos.duration_seconds", bounds.gte);
        if (bounds.lt !== null) {
          jq = jq.lt("videos.duration_seconds", bounds.lt);
        }
      }

      const sort = sortColumn(filters.sort);
      jq = jq
        .order(sort.column, {
          ascending: sort.ascending,
          referencedTable: "videos",
        })
        .range((page - 1) * pageSize, page * pageSize - 1);

      const { data, count, error } = await jq;
      if (!error) {
        const items = (data || [])
          .map((row) => {
            const video = embedOne(
              (row as unknown as { videos?: Video | Video[] | null }).videos,
            );
            return video ? mapVideo(video as never) : null;
          })
          .filter(Boolean) as ListingCard[];

        return {
          items,
          total: count || 0,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
        };
      }
      console.warn("catalogue_junction_fallback", error.message);
    }
  }

  let query = supabase
    .from("videos")
    .select(VIDEO_CARD_SELECT, { count: "exact" });

  if (categoryId) query = query.eq("category_id", categoryId);
  if (filters.q?.trim()) query = query.ilike("title", `%${filters.q.trim()}%`);

  const bounds = durationBounds(filters.duration);
  if (bounds) {
    query = query.gte("duration_seconds", bounds.gte);
    if (bounds.lt !== null) query = query.lt("duration_seconds", bounds.lt);
  }

  const sort = sortColumn(filters.sort);
  query = query
    .order(sort.column, { ascending: sort.ascending })
    .order("views", { ascending: false })
    .order("id", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;
  if (error) {
    console.error("catalogue_query_failed", error.message);
    return emptyResult(page, pageSize);
  }

  const rows = dedupeByDestination(
    (data || []) as { destination_url?: string; id: string }[],
  );

  return {
    items: rows.map((row) => mapVideo(row as never)),
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
  };
}

async function queryTrending(
  filters: CatalogueFilters,
  page: number,
  pageSize: number,
  categoryId?: string,
) {
  const supabase = getSupabaseAnon();

  // Prefer DB click_count when migration is applied
  let dbQuery = supabase
    .from("videos")
    .select(VIDEO_CARD_SELECT, { count: "exact" })
    .gt("click_count", 0);

  if (categoryId) dbQuery = dbQuery.eq("category_id", categoryId);
  if (filters.q?.trim()) {
    dbQuery = dbQuery.ilike("title", `%${filters.q.trim()}%`);
  }
  const bounds = durationBounds(filters.duration);
  if (bounds) {
    dbQuery = dbQuery.gte("duration_seconds", bounds.gte);
    if (bounds.lt !== null) {
      dbQuery = dbQuery.lt("duration_seconds", bounds.lt);
    }
  }

  dbQuery = dbQuery
    .order("click_count", { ascending: false })
    .order("views", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const dbRes = await dbQuery;
  if (!dbRes.error && (dbRes.data?.length || 0) > 0) {
    return {
      items: (dbRes.data || []).map((row) => mapVideo(row as never)),
      total: dbRes.count || 0,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil((dbRes.count || 0) / pageSize)),
    };
  }

  // Local click store fallback (works before SQL migration)
  const local = getTopLocalClicks(500);
  if (!local.length) return emptyResult(page, pageSize);

  const slugOrder = local.map((row) => row.slug);
  let localQuery = supabase
    .from("videos")
    .select(VIDEO_CARD_SELECT)
    .in("slug", slugOrder);

  if (categoryId) localQuery = localQuery.eq("category_id", categoryId);
  if (filters.q?.trim()) {
    localQuery = localQuery.ilike("title", `%${filters.q.trim()}%`);
  }
  if (bounds) {
    localQuery = localQuery.gte("duration_seconds", bounds.gte);
    if (bounds.lt !== null) {
      localQuery = localQuery.lt("duration_seconds", bounds.lt);
    }
  }

  const { data, error } = await localQuery;
  if (error || !data?.length) return emptyResult(page, pageSize);

  const rank = new Map(slugOrder.map((slug, i) => [slug, i]));
  const sorted = [...data].sort(
    (a, b) => (rank.get(a.slug) ?? 9999) - (rank.get(b.slug) ?? 9999),
  );
  const start = (page - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  return {
    items: pageRows.map((row) => mapVideo(row as never)),
    total: sorted.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(sorted.length / pageSize)),
  };
}

export async function getHomepageData() {
  const [categories, latest, popular, trending] = await Promise.all([
    getCategories(),
    queryCatalogue({ sort: "newest", page: 1, pageSize: 12 }),
    queryCatalogue({ sort: "views", page: 1, pageSize: 12 }),
    queryCatalogue({ sort: "trending", page: 1, pageSize: 12 }),
  ]);

  return {
    categories,
    latest: latest.items,
    popular: popular.items,
    trending: trending.items,
    featuredCategories: categories.slice(0, 8),
  };
}

/** Fire-and-forget site click for trending. */
export async function recordListingClick(slug: string) {
  if (!slug) return;
  // Always persist locally so trending works without the SQL migration
  try {
    incrementLocalClick(slug);
  } catch (err) {
    console.warn("local_click_failed", err);
  }

  if (!hasSupabaseConfig()) return;
  try {
    const supabase = getSupabaseAnon();
    const { error } = await supabase.rpc("increment_listing_clicks", {
      p_slug: slug,
    });
    if (error && !error.message.includes("increment_listing_clicks")) {
      console.warn("db_click_failed", error.message);
    }
  } catch (err) {
    console.warn("db_click_failed", err);
  }
}

export async function getVideoBySlug(slug: string) {
  if (!hasSupabaseConfig()) return null;
  const supabase = getSupabaseAnon();
  const { data } = await supabase
    .from("videos")
    .select(
      `id,video_id,title,slug,thumbnail_url,duration_seconds,views,destination_url,category_id,created_at,updated_at,${CATEGORY_EMBED}`,
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!data) return null;
  const raw = data as unknown as {
    categories?:
      | { name: string; slug: string }
      | { name: string; slug: string }[]
      | null;
  };
  const categoryRel = Array.isArray(raw.categories)
    ? raw.categories[0]
    : raw.categories;

  return {
    ...data,
    views: Number(data.views || 0),
    category: categoryRel
      ? { name: categoryRel.name, slug: categoryRel.slug }
      : { name: "Uncategorized", slug: "uncategorized" },
  };
}

export async function getSafeRedirectBySlug(slug: string) {
  if (!hasSupabaseConfig()) return null;
  const supabase = getSupabaseAnon();
  const { data } = await supabase
    .from("videos")
    .select("video_id,destination_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    destinationUrl: data.destination_url,
    videoId: data.video_id,
  };
}

export async function getSitemapEntries() {
  if (!hasSupabaseConfig()) {
    return {
      categories: [] as Category[],
      videos: [] as { slug: string; updated_at: string }[],
    };
  }
  const supabase = getSupabaseAnon();
  const [{ data: categories }, { data: videos }] = await Promise.all([
    supabase
      .from("categories")
      .select("id,name,slug,description,sort_order,is_featured"),
    supabase
      .from("videos")
      .select("slug,updated_at,destination_url")
      .order("updated_at", { ascending: false })
      .limit(8000),
  ]);

  const seen = new Set<string>();
  const uniqueVideos: { slug: string; updated_at: string }[] = [];
  for (const v of videos || []) {
    const key = (v.destination_url as string) || v.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueVideos.push({ slug: v.slug, updated_at: v.updated_at });
  }

  return {
    categories: categories || [],
    videos: uniqueVideos,
  };
}
