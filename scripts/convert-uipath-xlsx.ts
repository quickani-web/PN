/**
 * Convert UiPath Excel exports (Id, Title, Image, Views, Duration, VideoUrl)
 * into import-ready CSV files with required columns + category from filename.
 */
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { createUnzip } from "zlib";
import { execFileSync } from "child_process";

function decodeXml(text: string) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function loadSharedStrings(xml: string): string[] {
  const strings: string[] = [];
  const siRegex = /<(?:\w+:)?si>([\s\S]*?)<\/(?:\w+:)?si>/g;
  let match: RegExpExecArray | null;
  while ((match = siRegex.exec(xml))) {
    const parts = [
      ...match[1].matchAll(/<(?:\w+:)?t[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g),
    ].map((m) => decodeXml(m[1]));
    strings.push(parts.join(""));
  }
  return strings;
}

function extractXlsxXml(filePath: string, destDir: string) {
  mkdirSync(destDir, { recursive: true });
  const zipPath = path.join(destDir, "file.zip");
  // Copy to .zip for Expand-Archive compatibility on Windows
  execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      `Copy-Item -LiteralPath '${filePath.replace(/'/g, "''")}' -Destination '${zipPath.replace(/'/g, "''")}' -Force; if (Test-Path '${path.join(destDir, "xl").replace(/'/g, "''")}') { Remove-Item -Recurse -Force '${path.join(destDir, "xl").replace(/'/g, "''")}' }; Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
    ],
    { stdio: "pipe" },
  );
}

function parseRows(sheetXml: string, shared: string[]) {
  const rows: string[][] = [];
  const rowRegex = /<(?:\w+:)?row[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g;
  let match: RegExpExecArray | null;
  while ((match = rowRegex.exec(sheetXml))) {
    const cellsByCol = new Map<number, string>();
    const cellRegex =
      /<(?:\w+:)?c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g;
    let cell: RegExpExecArray | null;
    while ((cell = cellRegex.exec(match[1]))) {
      const attrs = cell[1] || "";
      const body = cell[2] || "";
      const ref = attrs.match(/\br="([A-Z]+)/)?.[1];
      if (!ref) continue;
      let col = 0;
      for (let i = 0; i < ref.length; i++) {
        col = col * 26 + (ref.charCodeAt(i) - 64);
      }
      col -= 1;
      const isShared = /\bt="s"/.test(attrs);
      const vMatch = body.match(/<(?:\w+:)?v>([\s\S]*?)<\/(?:\w+:)?v>/);
      if (!vMatch) {
        cellsByCol.set(col, "");
        continue;
      }
      const raw = vMatch[1];
      cellsByCol.set(col, isShared ? shared[Number(raw)] ?? raw : raw);
    }
    const maxCol = Math.max(-1, ...cellsByCol.keys());
    const row: string[] = [];
    for (let i = 0; i <= maxCol; i++) row.push(cellsByCol.get(i) || "");
    rows.push(row);
  }
  return rows;
}

function csvEscape(value: string) {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function categoryFromFile(filePath: string) {
  const base = path.basename(filePath, path.extname(filePath));
  if (/^pornstar$/i.test(base)) return "Pornstar";
  if (/^big\s*tits$/i.test(base)) return "Big Tits";
  if (/^pov$/i.test(base)) return "POV";
  if (/^milf$/i.test(base)) return "MILF";
  if (/^18-25$/i.test(base)) return "18-25";
  return base;
}

function convertFile(filePath: string, outCsv: string) {
  const work = path.join("tmp", "convert", path.basename(filePath, ".xlsx"));
  extractXlsxXml(filePath, work);
  const shared = loadSharedStrings(
    readFileSync(path.join(work, "xl", "sharedStrings.xml"), "utf8"),
  );
  const rows = parseRows(
    readFileSync(path.join(work, "xl", "worksheets", "sheet1.xml"), "utf8"),
    shared,
  );
  if (!rows.length) throw new Error(`No rows in ${filePath}`);

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    id: headers.findIndex((h) => h === "id" || h === "video_id"),
    title: headers.findIndex((h) => h === "title"),
    image: headers.findIndex((h) => h === "image" || h === "thumbnail_url"),
    views: headers.findIndex((h) => h === "views"),
    duration: headers.findIndex((h) => h === "duration"),
    url: headers.findIndex(
      (h) => h === "videourl" || h === "video_url" || h === "destination_url",
    ),
  };
  for (const [key, value] of Object.entries(idx)) {
    if (value < 0) throw new Error(`Missing column ${key} in ${filePath}`);
  }

  const category = categoryFromFile(filePath);
  const lines = [
    "video_id,title,thumbnail_url,duration,views,category,destination_url",
  ];
  let written = 0;
  for (const row of rows.slice(1)) {
    const videoId = String(row[idx.id] || "").trim();
    const title = String(row[idx.title] || "").trim();
    const thumb = String(row[idx.image] || "").trim();
    const duration = String(row[idx.duration] || "").trim();
    const views = String(row[idx.views] || "").trim();
    const dest = String(row[idx.url] || "").trim();
    if (!videoId && !title) continue;
    lines.push(
      [
        videoId,
        title,
        thumb,
        duration,
        views,
        category,
        dest,
      ]
        .map(csvEscape)
        .join(","),
    );
    written += 1;
  }

  mkdirSync(path.dirname(outCsv), { recursive: true });
  writeFileSync(outCsv, lines.join("\n"), "utf8");
  return { category, rows: written, outCsv };
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error("Usage: tsx scripts/convert-uipath-xlsx.ts <files.xlsx...>");
    process.exit(1);
  }
  const results = [];
  for (const file of files) {
    const out = path.join(
      "imports",
      "converted",
      `${path.basename(file, path.extname(file)).replace(/\s+/g, "-")}.csv`,
    );
    const result = convertFile(file, out);
    results.push(result);
    console.log(`Converted ${file} -> ${out} (${result.rows} rows, category=${result.category})`);
  }
  writeFileSync(
    "imports/converted/manifest.json",
    JSON.stringify(results, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
