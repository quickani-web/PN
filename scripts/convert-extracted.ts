import { mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

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

function categoryFromName(name: string) {
  if (/^pornstar$/i.test(name)) return "Pornstar";
  if (/^big\s*tits$/i.test(name)) return "Big Tits";
  if (/^pov$/i.test(name)) return "POV";
  if (/^milf$/i.test(name)) return "MILF";
  if (/^18-25$/i.test(name)) return "18-25";
  return name;
}

function convertOne(name: string) {
  const work = path.join("tmp", "xlsx", name);
  const shared = loadSharedStrings(
    readFileSync(path.join(work, "xl", "sharedStrings.xml"), "utf8"),
  );
  const rows = parseRows(
    readFileSync(path.join(work, "xl", "worksheets", "sheet1.xml"), "utf8"),
    shared,
  );
  if (!rows.length) throw new Error(`No rows for ${name}`);

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
    if (value < 0) throw new Error(`Missing column ${key} in ${name}`);
  }

  const category = categoryFromName(name);
  const lines = [
    "video_id,title,thumbnail_url,duration,views,category,destination_url",
  ];
  for (const row of rows.slice(1)) {
    const videoId = String(row[idx.id] || "").trim();
    const title = String(row[idx.title] || "").trim();
    if (!videoId && !title) continue;
    lines.push(
      [
        videoId,
        title,
        String(row[idx.image] || "").trim(),
        String(row[idx.duration] || "").trim(),
        String(row[idx.views] || "").trim(),
        category,
        String(row[idx.url] || "").trim(),
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const outName = name.replace(/\s+/g, "-");
  const outCsv = path.join("imports", "converted", `${outName}.csv`);
  mkdirSync(path.dirname(outCsv), { recursive: true });
  writeFileSync(outCsv, lines.join("\n"), "utf8");
  return {
    category,
    rows: lines.length - 1,
    outCsv,
    sample: lines.slice(0, 3),
  };
}

function main() {
  const names = ["MILF", "PornStar", "POV", "18-25", "Big Tits"];
  const results = names.map((name) => {
    const result = convertOne(name);
    console.log(
      `Converted ${name}: ${result.rows} rows -> ${result.outCsv} [${result.category}]`,
    );
    console.log(result.sample.join("\n"));
    console.log("---");
    return result;
  });
  writeFileSync(
    "imports/converted/manifest.json",
    JSON.stringify(results, null, 2),
  );
  console.log(
    "TOTAL",
    results.reduce((sum, r) => sum + r.rows, 0),
  );
}

main();
