/**
 * Download remote thumbnails into Supabase Storage and rewrite videos.thumbnail_url.
 *
 *   npx tsx scripts/cache-thumbnails.ts
 *   npx tsx scripts/cache-thumbnails.ts --limit=5000 --concurrency=12
 *
 * Skips rows already pointing at our storage bucket.
 * Dead pix-* links fail fast and are left alone (placeholder UI covers them).
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import {
  downloadAndStoreThumb,
  ensureThumbBucket,
  isStoredThumbUrl,
} from "./lib/thumb-storage";

function argNum(name: string, fallback: number): number {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

async function mapPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, async () => {
      for (;;) {
        const i = next++;
        if (i >= items.length) return;
        await fn(items[i]);
      }
    }),
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const limit = argNum("limit", 0); // 0 = all
  const concurrency = argNum("concurrency", 12);
  const pageSize = 400;

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureThumbBucket(supabase);
  console.log(`Bucket ready. concurrency=${concurrency} limit=${limit || "all"}`);

  let saved = 0;
  let skipped = 0;
  let failed = 0;
  let scanned = 0;
  let lastId = "00000000-0000-0000-0000-000000000000";

  for (;;) {
    if (limit && saved + failed + skipped >= limit) break;

    // Keyset pagination by id — avoids deep OFFSET timeouts on large tables
    const { data, error } = await supabase
      .from("videos")
      .select("id,video_id,thumbnail_url,views")
      .gt("id", lastId)
      .order("id", { ascending: true })
      .limit(pageSize);

    if (error) throw error;
    if (!data?.length) break;

    lastId = data[data.length - 1].id;
    const todo = data.filter((row) => !isStoredThumbUrl(row.thumbnail_url, url));
    skipped += data.length - todo.length;

    await mapPool(todo, concurrency, async (row) => {
      if (limit && saved + failed + skipped >= limit) return;

      const result = await downloadAndStoreThumb(
        supabase,
        url,
        row.video_id,
        row.thumbnail_url,
      );
      if (!result.ok) {
        failed += 1;
        if (failed <= 15 || failed % 250 === 0) {
          console.log(`fail ${row.video_id}: ${result.error}`);
        }
        return;
      }

      const { error: upErr } = await supabase
        .from("videos")
        .update({ thumbnail_url: result.publicUrl })
        .eq("id", row.id);

      if (upErr) {
        failed += 1;
        console.log(`db ${row.video_id}: ${upErr.message}`);
        return;
      }
      saved += 1;
    });

    scanned += data.length;
    console.log(JSON.stringify({ scanned, saved, failed, skipped, lastId }));

    if (data.length < pageSize) break;
  }

  console.log(JSON.stringify({ done: true, scanned, saved, failed, skipped }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
