import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id,name");
  if (error) throw error;

  for (const cat of categories || []) {
    const { count } = await supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("category_id", cat.id);
    console.log(`${cat.name}: ${count}`);
    if ((count || 0) === 0) {
      const { error: delError } = await supabase
        .from("categories")
        .delete()
        .eq("id", cat.id);
      if (delError) throw delError;
      console.log(`  deleted empty category ${cat.name}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
