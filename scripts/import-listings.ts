/**
 * Local Excel/CSV importer (no admin dashboard).
 *
 * Usage:
 *   npx tsx scripts/import-listings.ts imports/sample.csv
 *   npx tsx scripts/import-listings.ts path/to/file.xlsx
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 * Writes row failures to import-errors.txt
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import {
  validateDestinationUrl,
  validateThumbnailUrl,
} from "../src/lib/security/urls";
import { parseDurationToSeconds, slugify } from "../src/lib/utils";

function parseViews(input: string): number | null {
  const raw = String(input || "").trim().replace(/,/g, "").toUpperCase();
  if (!raw) return 0;
  const match = raw.match(/^(\d+(?:\.\d+)?)([KMB])?$/);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base) || base < 0) return null;
  const mult =
    match[2] === "K" ? 1_000 : match[2] === "M" ? 1_000_000 : match[2] === "B" ? 1_000_000_000 : 1;
  return Math.floor(base * mult);
}

const REQUIRED = [
  "video_id",
  "title",
  "thumbnail_url",
  "duration",
  "views",
  "category",
  "destination_url",
] as const;

type Row = Record<(typeof REQUIRED)[number], string>;

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function rowsFromObjects(objects: Record<string, unknown>[]): {
  rows: Row[];
  errors: string[];
} {
  const errors: string[] = [];
  if (!objects.length) return { rows: [], errors: ["File has no data rows"] };

  const headers = Object.keys(objects[0]).map(normalizeHeader);

  const has = (col: string) => {
    if (headers.includes(col)) return true;
    if (col === "video_id") return headers.includes("id");
    if (col === "thumbnail_url")
      return headers.includes("image") || headers.includes("thumb");
    if (col === "destination_url")
      return (
        headers.includes("videourl") ||
        headers.includes("video_url") ||
        headers.includes("url")
      );
    return false;
  };

  const missing = REQUIRED.filter((col) => !has(col));
  if (missing.length) {
    return {
      rows: [],
      errors: missing.map((col) => `Missing required column: ${col}`),
    };
  }

  const rows: Row[] = objects.map((obj) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
      normalized[normalizeHeader(key)] = String(value ?? "").trim();
    }
    // UiPath / extractor aliases → importer columns
    return {
      video_id: normalized.video_id || normalized.id || "",
      title: normalized.title || "",
      thumbnail_url:
        normalized.thumbnail_url || normalized.image || normalized.thumb || "",
      duration: normalized.duration || "",
      views: normalized.views || "",
      category: normalized.category || "",
      destination_url:
        normalized.destination_url ||
        normalized.videourl ||
        normalized.video_url ||
        normalized.url ||
        "",
    };
  });

  return { rows, errors };
}

async function parseFile(filePath: string) {
  const buffer = readFileSync(filePath);
  const lower = filePath.toLowerCase();

  if (lower.endsWith(".csv")) {
    const parsed = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: true,
    });
    if (parsed.errors.length) {
      return {
        rows: [] as Row[],
        errors: parsed.errors.map((e) => e.message),
      };
    }
    return rowsFromObjects(parsed.data);
  }

  if (lower.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) return { rows: [] as Row[], errors: ["Workbook has no sheets"] };

    const headers: string[] = [];
    sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => {
      headers[col - 1] = String(cell.text || cell.value || "").trim();
    });

    const objects: Record<string, unknown>[] = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        if (!header) return;
        const cell = row.getCell(idx + 1);
        const value = cell.value;
        if (value && typeof value === "object" && "text" in value) {
          obj[header] = (value as { text: string }).text;
        } else if (value && typeof value === "object" && "result" in value) {
          obj[header] = (value as { result: unknown }).result;
        } else {
          obj[header] = value ?? "";
        }
      });
      objects.push(obj);
    });
    return rowsFromObjects(objects);
  }

  return {
    rows: [] as Row[],
    errors: ["Unsupported file type. Use .csv or .xlsx"],
  };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx scripts/import-listings.ts <file.csv|file.xlsx>");
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const absolute = path.resolve(filePath);
  const parsed = await parseFile(absolute);
  if (parsed.errors.length && !parsed.rows.length) {
    writeFileSync("import-errors.txt", parsed.errors.join("\n"));
    console.error("Import aborted. See import-errors.txt");
    process.exit(1);
  }

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id,name,slug,sort_order");
  if (catError) throw catError;

  const categoryMap = new Map<string, string>();
  let maxSort = 0;
  for (const c of categories || []) {
    categoryMap.set(c.name.toLowerCase(), c.id);
    categoryMap.set(c.slug.toLowerCase(), c.id);
    maxSort = Math.max(maxSort, c.sort_order || 0);
  }

  async function ensureCategory(rawName: string): Promise<string | null> {
    const name = rawName.trim();
    if (!name) return null;
    const key = name.toLowerCase();
    const existing = categoryMap.get(key) || categoryMap.get(slugify(name));
    if (existing) return existing;

    maxSort += 1;
    const slug = slugify(name) || `category-${maxSort}`;
    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        slug,
        description: null,
        is_featured: true,
        sort_order: maxSort,
      })
      .select("id,name,slug")
      .maybeSingle();

    if (error) {
      // Race / unique: fetch existing
      const { data: again } = await supabase
        .from("categories")
        .select("id,name,slug")
        .or(`slug.eq.${slug},name.eq.${name}`)
        .maybeSingle();
      if (!again) return null;
      categoryMap.set(again.name.toLowerCase(), again.id);
      categoryMap.set(again.slug.toLowerCase(), again.id);
      return again.id;
    }
    if (!data) return null;
    categoryMap.set(data.name.toLowerCase(), data.id);
    categoryMap.set(data.slug.toLowerCase(), data.id);
    console.log(`Created category: ${data.name}`);
    return data.id;
  }

  // Pre-create every distinct category from the file
  const distinctCats = [
    ...new Set(
      parsed.rows
        .map((r) => r.category.trim())
        .filter(Boolean),
    ),
  ];
  for (const cat of distinctCats) {
    await ensureCategory(cat);
  }

  const existingIds = new Set<string>();
  const existingDestinations = new Set<string>();
  {
    const pageSize = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("videos")
        .select("video_id,destination_url")
        .range(from, from + pageSize - 1);
      if (error) throw error;
      if (!data?.length) break;
      for (const row of data) {
        existingIds.add(row.video_id);
        if (row.destination_url) existingDestinations.add(row.destination_url);
      }
      if (data.length < pageSize) break;
      from += pageSize;
    }
  }
  const seenInFile = new Set<string>();

  const valid: Array<{
    video_id: string;
    title: string;
    slug: string;
    thumbnail_url: string;
    duration_seconds: number;
    views: number;
    destination_url: string;
    category_id: string;
  }> = [];
  const rowErrors: string[] = [...parsed.errors];
  const skipCounts: Record<string, number> = {};
  const bump = (reason: string) => {
    skipCounts[reason] = (skipCounts[reason] || 0) + 1;
  };

  parsed.rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const issues: string[] = [];

    const categoryId =
      categoryMap.get(row.category.toLowerCase()) ||
      categoryMap.get(slugify(row.category));
    if (!categoryId) issues.push(`unknown category: ${row.category}`);

    if (!row.video_id) issues.push("video_id is required");
    if (row.video_id && seenInFile.has(row.video_id)) {
      bump("duplicate video_id in file");
      return;
    }
    if (row.video_id && existingIds.has(row.video_id)) {
      bump("video_id already exists");
      return;
    }
    if (row.title.trim().length < 2) issues.push("title is required");

    const thumb = validateThumbnailUrl(row.thumbnail_url);
    if (!thumb.ok) issues.push(`thumbnail_url: ${thumb.error}`);

    const duration = parseDurationToSeconds(row.duration);
    if (duration === null) issues.push("duration is invalid");

    const views = parseViews(row.views);
    if (views === null) {
      issues.push("views must be a non-negative number (e.g. 1200, 98K, 1.2M)");
    }

    const dest = validateDestinationUrl(row.destination_url);
    if (!dest.ok) issues.push(`destination_url: ${dest.error}`);

    // Also skip if this destination was already imported (prevents cross-category clones)
    if (dest.ok && existingDestinations.has(dest.normalized)) {
      bump("destination already exists");
      return;
    }

    if (issues.length) {
      bump("validation failed");
      if (rowErrors.length < 500) {
        rowErrors.push(`Row ${rowNumber}: ${issues.join("; ")}`);
      }
      return;
    }

    seenInFile.add(row.video_id);
    existingDestinations.add(dest.ok ? dest.normalized : row.destination_url);
    const baseSlug = slugify(row.title) || slugify(row.video_id) || "listing";
    valid.push({
      video_id: row.video_id,
      title: row.title.trim(),
      slug: `${baseSlug}-${slugify(row.video_id).slice(0, 40) || index}`,
      thumbnail_url: thumb.ok ? thumb.normalized : row.thumbnail_url,
      duration_seconds: duration!,
      views: views!,
      destination_url: dest.ok ? dest.normalized : row.destination_url,
      category_id: categoryId!,
    });
  });

  const batchSize = 200;
  let imported = 0;
  for (let i = 0; i < valid.length; i += batchSize) {
    const batch = valid.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("videos")
      .upsert(batch, { onConflict: "video_id", ignoreDuplicates: true })
      .select("id");
    if (error) {
      rowErrors.push(`Batch starting at ${i}: ${error.message}`);
      continue;
    }
    imported += data?.length ?? 0;
  }

  writeFileSync(
    "import-errors.txt",
    [
      `Skip summary: ${JSON.stringify(skipCounts)}`,
      "",
      ...(rowErrors.length ? rowErrors : ["No row validation errors."]),
      "",
    ].join("\n"),
  );

  console.log(
    JSON.stringify(
      {
        totalRows: parsed.rows.length,
        valid: valid.length,
        imported,
        skippedOrInvalid: parsed.rows.length - valid.length,
        skipCounts,
        errorFile: "import-errors.txt",
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
