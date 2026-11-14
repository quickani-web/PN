/**
 * Clear videos and re-import all converted CSVs with category-scoped video_ids.
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { spawnSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Deleting existing videos...");
  const { error: delError, count: deletedCount } = await supabase
    .from("videos")
    .delete({ count: "exact" })
    .gte("created_at", "1970-01-01T00:00:00Z");
  if (delError) throw delError;
  console.log(`Deleted ${deletedCount ?? "all"} videos`);

  const dir = path.join("imports", "converted");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".csv"))
    .map((f) => path.join(dir, f));

  for (const file of files) {
    console.log(`\nImporting ${file}...`);
    const result = spawnSync("npx", ["tsx", "scripts/import-listings.ts", file], {
      stdio: "inherit",
      shell: true,
    });
    if (result.status !== 0) {
      throw new Error(`Import failed for ${file}`);
    }
  }

  const { count: totalCount } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true });
  console.log(`\nDone. Total videos: ${totalCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
