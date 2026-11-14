/**
 * Assign each unique video to one of the categories it appeared in (from CSVs),
 * load-balancing so no single category keeps almost everything after dedupe.
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

  const destToCats = new Map<string, Set<string>>();
  const dir = path.join(process.cwd(), "imports", "converted");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".csv"))) {
    const text = readFileSync(path.join(dir, file), "utf8");
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
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
    }
  }

  const pageSize = 1000;
  let from = 0;
  const videos: { id: string; destination_url: string; category_id: string }[] =
    [];
  for (;;) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,destination_url,category_id")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    videos.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  const counts = new Map<string, number>(categories.map((c) => [c.id, 0]));
  const updates: { id: string; category_id: string }[] = [];

  for (const v of videos) {
    const options = [...(destToCats.get(v.destination_url) || [])];
    if (!options.length && v.category_id) options.push(v.category_id);
    if (!options.length) continue;

    // Prefer the category with the fewest assignments so far
    options.sort(
      (a, b) => (counts.get(a) || 0) - (counts.get(b) || 0) || a.localeCompare(b),
    );
    const chosen = options[0];
    counts.set(chosen, (counts.get(chosen) || 0) + 1);
    if (chosen !== v.category_id) {
      updates.push({ id: v.id, category_id: chosen });
    }
  }

  console.log(`Videos: ${videos.length}; updates needed: ${updates.length}`);

  // Group by target category for fewer round-trips
  const byCat = new Map<string, string[]>();
  for (const u of updates) {
    const list = byCat.get(u.category_id) || [];
    list.push(u.id);
    byCat.set(u.category_id, list);
  }

  let done = 0;
  for (const [category_id, ids] of byCat) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      let lastErr: unknown = null;
      for (let t = 1; t <= 5; t++) {
        const { error } = await supabase
          .from("videos")
          .update({ category_id })
          .in("id", chunk);
        if (!error) {
          lastErr = null;
          break;
        }
        lastErr = error;
        await new Promise((r) => setTimeout(r, 800 * t));
      }
      if (lastErr) throw lastErr;
      done += chunk.length;
      console.log(`Updated ${done}/${updates.length}`);
    }
  }

  for (const c of categories) {
    const { count } = await supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("category_id", c.id);
    console.log(`${c.slug}: ${count}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
