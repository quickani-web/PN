import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

type ClickMap = Record<string, number>;

const dataDir = path.join(process.cwd(), ".data");
const filePath = path.join(dataDir, "clicks.json");

function readMap(): ClickMap {
  try {
    if (!existsSync(filePath)) return {};
    return JSON.parse(readFileSync(filePath, "utf8")) as ClickMap;
  } catch {
    return {};
  }
}

function writeMap(map: ClickMap) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(map), "utf8");
}

/** Local durable click counters (works before Supabase migration is applied). */
export function incrementLocalClick(slug: string) {
  if (!slug) return;
  const map = readMap();
  map[slug] = (map[slug] || 0) + 1;
  writeMap(map);
}

export function getLocalClickCount(slug: string): number {
  return readMap()[slug] || 0;
}

export function getTopLocalClicks(limit = 24): { slug: string; clicks: number }[] {
  return Object.entries(readMap())
    .map(([slug, clicks]) => ({ slug, clicks }))
    .filter((row) => row.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}
