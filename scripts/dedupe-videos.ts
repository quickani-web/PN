/**
 * Merge duplicate destination_url rows into one video + video_categories links.
 * Requires supabase/migration_dedupe_categories.sql to be applied first.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { slugify } from "../src/lib/utils";

type VideoRow = {
  id: string;
  video_id: string;
  title: string;
  slug: string;
  thumbnail_url: string;
  duration_seconds: number;
  views: number;
  destination_url: string;
  category_id: string;
  created_at: string;
};

async function fetchAllVideos(
  supabase: ReturnType<typeof createClient>,
): Promise<VideoRow[]> {
  const pageSize = 1000;
  const rows: VideoRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("videos")
      .select(
        "id,video_id,title,slug,thumbnail_url,duration_seconds,views,destination_url,category_id,created_at",
      )
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    rows.push(...(data as VideoRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

function sourceId(videoId: string) {
  const parts = videoId.split("-");
  // category-slug-sourceId  OR  just sourceId
  if (parts.length >= 2 && !/^\d+$/.test(parts[0])) {
    return parts.slice(1).join("-");
  }
  return videoId;
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Ensure junction table exists (probe)
  const probe = await supabase.from("video_categories").select("video_uuid").limit(1);
  if (probe.error) {
    console.error(
      "video_categories table missing. Run supabase/migration_dedupe_categories.sql in the SQL editor first.",
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  console.log("Loading videos...");
  const videos = await fetchAllVideos(supabase);
  console.log(`Loaded ${videos.length}`);

  const groups = new Map<string, VideoRow[]>();
  for (const v of videos) {
    const key = v.destination_url;
    const list = groups.get(key) || [];
    list.push(v);
    groups.set(key, list);
  }

  let kept = 0;
  let deleted = 0;
  let links = 0;

  for (const [, group] of groups) {
    group.sort((a, b) => b.views - a.views || a.created_at.localeCompare(b.created_at));
    const winner = group[0];
    const categoryIds = [...new Set(group.map((g) => g.category_id))];
    const cleanVideoId = sourceId(winner.video_id);

    // Normalize winner video_id / slug if needed
    if (winner.video_id !== cleanVideoId) {
      const baseSlug = slugify(winner.title) || "listing";
      await supabase
        .from("videos")
        .update({
          video_id: cleanVideoId,
          slug: `${baseSlug}-${slugify(cleanVideoId).slice(0, 40)}`,
        })
        .eq("id", winner.id);
    }

    // Link all categories
    const linkRows = categoryIds.map((category_id) => ({
      video_uuid: winner.id,
      category_id,
    }));
    const { error: linkError } = await supabase
      .from("video_categories")
      .upsert(linkRows, { onConflict: "video_uuid,category_id" });
    if (linkError) throw linkError;
    links += linkRows.length;

    // Delete losers
    const loserIds = group.slice(1).map((g) => g.id);
    if (loserIds.length) {
      for (let i = 0; i < loserIds.length; i += 200) {
        const chunk = loserIds.slice(i, i + 200);
        const { error: delError } = await supabase
          .from("videos")
          .delete()
          .in("id", chunk);
        if (delError) throw delError;
      }
      deleted += loserIds.length;
    }
    kept += 1;
    if (kept % 500 === 0) console.log(`Processed ${kept} unique videos...`);
  }

  const { count } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true });

  console.log(
    JSON.stringify({ uniqueKept: kept, duplicatesDeleted: deleted, categoryLinks: links, totalNow: count }, null, 2),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
