import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { slugify } from "../src/lib/utils";

const CATEGORIES = [
  { name: "POV", description: null, is_featured: true, sort_order: 1 },
  { name: "Pornstar", description: null, is_featured: true, sort_order: 2 },
  { name: "Big Tits", description: null, is_featured: true, sort_order: 3 },
  { name: "MILF", description: null, is_featured: true, sort_order: 4 },
  { name: "18-25", description: null, is_featured: true, sort_order: 5 },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const cat of CATEGORIES) {
    const slug = slugify(cat.name);

    const { data: existingBySlug } = await supabase
      .from("categories")
      .select("id,name,slug")
      .eq("slug", slug)
      .maybeSingle();
    const { data: existingByName } = existingBySlug
      ? { data: null }
      : await supabase
          .from("categories")
          .select("id,name,slug")
          .eq("name", cat.name)
          .maybeSingle();
    const existing = existingBySlug || existingByName;

    if (existing) {
      console.log(`Skipped existing category: ${existing.name}`);
      continue;
    }

    const { error } = await supabase.from("categories").insert({
      name: cat.name,
      slug,
      description: cat.description,
      is_featured: cat.is_featured,
      sort_order: cat.sort_order,
    });
    if (error) {
      if (error.code === "23505") {
        console.log(`Skipped duplicate category: ${cat.name}`);
        continue;
      }
      throw error;
    }
    console.log(`Added category: ${cat.name}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
