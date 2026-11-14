/**
 * Creates video_categories links from converted CSVs so one unique video
 * can appear in every category it was listed under (no row clones).
 *
 * Prerequisites: run supabase/migration_dedupe_categories.sql in Supabase SQL editor.
 *
 * Usage: npx tsx scripts/rebuild-video-categories.ts
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { readFileSync, readdirSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import Papa from "papaparse";
import { validateDestinationUrl } from "../src/lib/security/urls";
import { slugify } from "../src/lib/utils";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const probe = await supabase
    .from("video_categories")
    .select("video_uuid", { count: "exact", head: true });

  if (probe.error) {
    console.error(
      "video_categories table missing. Run supabase/migration_dedupe_categories.sql in the Supabase SQL editor, then re-run this script.",
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  const { data: categories, error: catErr } = await supabase
    .from("categories")
    .select("id,name,slug");
  if (catErr || !categories?.length) throw catErr || new Error("no categories");

  const catBySlug = new Map(
    categories.map((c) => [c.slug.toLowerCase(), c.id]),
  );
  const catByName = new Map(
    categories.map((c) => [c.name.toLowerCase(), c.id]),
  );

  function resolveCategory(raw: string): string | null {
    const key = raw.trim().toLowerCase();
    return (
      catByName.get(key) ||
      catBySlug.get(slugify(raw)) ||
      catBySlug.get(key.replace(/\s+/g, "-")) ||
      null
    );
  }

  // destination_url -> set of category ids
  const destToCats = new Map<string, Set<string>>();
  const dir = path.join(process.cwd(), "imports", "converted");
  const files = readdirSync(dir).filter((f) => f.endsWith(".csv"));

  for (const file of files) {
    const text = readFileSync(path.join(dir, file), "utf8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    let linked = 0;
    for (const row of parsed.data) {
      const dest = validateDestinationUrl(row.destination_url || "");
      if (!dest.ok) continue;
      const catId = resolveCategory(row.category || "");
      if (!catId) continue;
      let set = destToCats.get(dest.normalized);
      if (!set) {
        set = new Set();
        destToCats.set(dest.normalized, set);
      }
      set.add(catId);
      linked += 1;
    }
    console.log(`${file}: ${linked} category links from rows`);
  }

  // Load all videos keyed by destination
  const pageSize = 1000;
  let from = 0;
  const videoByDest = new Map<string, string>();
  for (;;) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,destination_url,category_id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const v of data) {
      if (v.destination_url) videoByDest.set(v.destination_url, v.id);
      // Always keep primary category_id in the junction
      if (v.category_id) {
        let set = destToCats.get(v.destination_url);
        if (!set) {
          set = new Set();
          destToCats.set(v.destination_url, set);
        }
        set.add(v.category_id);
      }
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }

  console.log(`Videos loaded: ${videoByDest.size}`);

  const rows: { video_uuid: string; category_id: string }[] = [];
  for (const [dest, cats] of destToCats) {
    const videoUuid = videoByDest.get(dest);
    if (!videoUuid) continue;
    for (const category_id of cats) {
      rows.push({ video_uuid: videoUuid, category_id });
    }
  }

  console.log(`Upserting ${rows.length} video_categories rows…`);

  // Clear existing junction then insert fresh
  const { error: clearErr } = await supabase
    .from("video_categories")
    .delete()
    .neq("video_uuid", "00000000-0000-0000-0000-000000000000");
  if (clearErr) throw clearErr;

  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from("video_categories").upsert(chunk, {
      onConflict: "video_uuid,category_id",
      ignoreDuplicates: true,
    });
    if (error) throw error;
    inserted += chunk.length;
    if (inserted % 2000 === 0 || inserted === rows.length) {
      console.log(`Inserted ${inserted}/${rows.length}`);
    }
  }

  // Report counts
  for (const c of categories) {
    const { count } = await supabase
      .from("video_categories")
      .select("video_uuid", { count: "exact", head: true })
      .eq("category_id", c.id);
    console.log(`${c.slug}: ${count}`);
  }

  const { count: videoCount } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true });
  console.log(JSON.stringify({ videos: videoCount, links: rows.length }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
