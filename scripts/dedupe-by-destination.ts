/**
 * Permanently delete cross-category duplicate listings (same destination_url).
 * Keeps the highest-view row. No video_id renames (avoids unique conflicts).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";

type VideoRow = {
  id: string;
  views: number;
  destination_url: string;
  created_at: string;
};

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const pageSize = 1000;
  const videos: VideoRow[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,views,destination_url,created_at")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    videos.push(...(data as VideoRow[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Loaded ${videos.length} videos`);

  const groups = new Map<string, VideoRow[]>();
  for (const v of videos) {
    const list = groups.get(v.destination_url) || [];
    list.push(v);
    groups.set(v.destination_url, list);
  }

  const loserIds: string[] = [];
  let kept = 0;
  for (const [, group] of groups) {
    group.sort(
      (a, b) => b.views - a.views || a.created_at.localeCompare(b.created_at),
    );
    kept += 1;
    for (const loser of group.slice(1)) loserIds.push(loser.id);
  }

  console.log(`Unique destinations: ${kept}; duplicates to delete: ${loserIds.length}`);

  let deleted = 0;
  for (let i = 0; i < loserIds.length; i += 200) {
    const chunk = loserIds.slice(i, i + 200);
    const { error } = await supabase.from("videos").delete().in("id", chunk);
    if (error) throw error;
    deleted += chunk.length;
    if (deleted % 1000 === 0 || deleted === loserIds.length) {
      console.log(`Deleted ${deleted}/${loserIds.length}`);
    }
  }

  const { count } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true });

  console.log(JSON.stringify({ kept, deleted, totalNow: count }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
