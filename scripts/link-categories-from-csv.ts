/**
 * Reads AllCategories.csv and links each unique video to EVERY Category
 * value it appears under (many-to-many via video_categories).
 *
 * Requires video_categories table (supabase/migration_dedupe_categories.sql).
 *
 * Usage:
 *   npx tsx scripts/link-categories-from-csv.ts "C:\path\AllCategories.csv"
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createReadStream } from "fs";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { validateDestinationUrl } from "../src/lib/security/urls";
import { slugify } from "../src/lib/utils";

const file =
  process.argv[2] ||
  "C:/Users/MM/Documents/UiPath/BlankProcess/AllCategories.csv";

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
      "Run supabase/migration_dedupe_categories.sql in Supabase SQL editor first.",
    );
    console.error(probe.error.message);
    process.exit(1);
  }

  // category name/slug -> id
  const { data: cats, error: catErr } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order");
  if (catErr) throw catErr;

  const catMap = new Map<string, string>();
  let maxSort = 0;
  for (const c of cats || []) {
    catMap.set(c.name.toLowerCase(), c.id);
    catMap.set(c.slug.toLowerCase(), c.id);
    maxSort = Math.max(maxSort, c.sort_order || 0);
  }

  async function ensureCategory(name: string): Promise<string> {
    const key = name.toLowerCase();
    const hit = catMap.get(key) || catMap.get(slugify(name));
    if (hit) return hit;
    maxSort += 1;
    const slug = slugify(name) || `cat-${maxSort}`;
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        slug,
        is_featured: true,
        sort_order: maxSort,
      })
      .select("id,name,slug")
      .maybeSingle();
    if (error || !data) {
      const { data: again } = await supabase
        .from("categories")
        .select("id,name,slug")
        .or(`slug.eq.${slug},name.eq.${name}`)
        .maybeSingle();
      if (!again) throw error || new Error(`failed to create ${name}`);
      catMap.set(again.name.toLowerCase(), again.id);
      catMap.set(again.slug.toLowerCase(), again.id);
      return again.id;
    }
    catMap.set(data.name.toLowerCase(), data.id);
    catMap.set(data.slug.toLowerCase(), data.id);
    console.log("Created category:", data.name);
    return data.id;
  }

  // video_id / destination -> set of category names from CSV
  const byVideoId = new Map<string, Set<string>>();
  const byDest = new Map<string, Set<string>>();
  let csvRows = 0;

  await new Promise<void>((resolve, reject) => {
    Papa.parse(createReadStream(file, "utf8"), {
      header: true,
      skipEmptyLines: true,
      step: (result) => {
        const row = result.data as Record<string, string>;
        const cat = (row.Category || "").trim();
        const id = String(row.Id || "").trim();
        const url = (row.VideoUrl || "").trim();
        if (!cat) return;
        csvRows += 1;
        if (id) {
          let set = byVideoId.get(id);
          if (!set) {
            set = new Set();
            byVideoId.set(id, set);
          }
          set.add(cat);
        }
        const dest = validateDestinationUrl(url);
        if (dest.ok) {
          let set = byDest.get(dest.normalized);
          if (!set) {
            set = new Set();
            byDest.set(dest.normalized, set);
          }
          set.add(cat);
        }
      },
      complete: () => resolve(),
      error: (err) => reject(err),
    });
  });

  console.log(
    `CSV rows=${csvRows}; unique ids=${byVideoId.size}; unique dests=${byDest.size}`,
  );

  // Ensure categories
  const allCatNames = new Set<string>();
  for (const set of byVideoId.values()) for (const c of set) allCatNames.add(c);
  for (const name of allCatNames) await ensureCategory(name);

  // Load videos
  const pageSize = 1000;
  let from = 0;
  const videos: {
    id: string;
    video_id: string;
    destination_url: string;
    category_id: string;
  }[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,video_id,destination_url,category_id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    videos.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Loaded ${videos.length} videos`);

  const links: { video_uuid: string; category_id: string }[] = [];
  const seenLink = new Set<string>();

  function addLink(videoUuid: string, catName: string) {
    const category_id =
      catMap.get(catName.toLowerCase()) || catMap.get(slugify(catName));
    if (!category_id) return;
    const key = `${videoUuid}:${category_id}`;
    if (seenLink.has(key)) return;
    seenLink.add(key);
    links.push({ video_uuid: videoUuid, category_id });
  }

  for (const v of videos) {
    // Always keep primary category_id
    if (v.category_id) {
      const key = `${v.id}:${v.category_id}`;
      if (!seenLink.has(key)) {
        seenLink.add(key);
        links.push({ video_uuid: v.id, category_id: v.category_id });
      }
    }
    const fromId = byVideoId.get(v.video_id);
    if (fromId) for (const c of fromId) addLink(v.id, c);
    const fromUrl = byDest.get(v.destination_url);
    if (fromUrl) for (const c of fromUrl) addLink(v.id, c);
  }

  console.log(`Upserting ${links.length} category links…`);

  // Clear + insert in batches
  const { error: clearErr } = await supabase
    .from("video_categories")
    .delete()
    .neq("video_uuid", "00000000-0000-0000-0000-000000000000");
  if (clearErr) throw clearErr;

  let done = 0;
  for (let i = 0; i < links.length; i += 500) {
    const chunk = links.slice(i, i + 500);
    const { error } = await supabase.from("video_categories").upsert(chunk, {
      onConflict: "video_uuid,category_id",
      ignoreDuplicates: true,
    });
    if (error) throw error;
    done += chunk.length;
    if (done % 5000 === 0 || done === links.length) {
      console.log(`Linked ${done}/${links.length}`);
    }
  }

  // Report junction counts
  const { data: allCats } = await supabase
    .from("categories")
    .select("id,name,slug")
    .order("sort_order");
  for (const c of allCats || []) {
    const { count } = await supabase
      .from("video_categories")
      .select("video_uuid", { count: "exact", head: true })
      .eq("category_id", c.id);
    console.log(`${c.name}: ${count}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
