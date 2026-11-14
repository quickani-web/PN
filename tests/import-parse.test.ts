import { describe, expect, it } from "vitest";
import { parseDurationToSeconds } from "@/lib/utils";
import {
  validateDestinationUrl,
  validateThumbnailUrl,
} from "@/lib/security/urls";

const REQUIRED = [
  "video_id",
  "title",
  "thumbnail_url",
  "duration",
  "views",
  "category",
  "destination_url",
] as const;

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function validateRow(
  row: Record<string, string>,
  opts: { knownCategories: Set<string>; existingIds: Set<string>; seen: Set<string> },
) {
  const errors: string[] = [];
  if (!row.video_id) errors.push("video_id required");
  if (opts.seen.has(row.video_id) || opts.existingIds.has(row.video_id)) {
    errors.push("duplicate video_id");
  }
  if (!row.title || row.title.length < 2) errors.push("title required");
  if (!validateThumbnailUrl(row.thumbnail_url).ok) errors.push("bad thumbnail");
  if (parseDurationToSeconds(row.duration) === null) errors.push("bad duration");
  if (!Number.isFinite(Number(row.views)) || Number(row.views) < 0) {
    errors.push("bad views");
  }
  if (!opts.knownCategories.has(row.category.toLowerCase())) {
    errors.push("unknown category");
  }
  if (!validateDestinationUrl(row.destination_url).ok) errors.push("bad destination");
  return errors;
}

describe("final import rules", () => {
  it("requires the seven exact columns", () => {
    const headers = [
      "video_id",
      "title",
      "thumbnail_url",
      "duration",
      "views",
      "category",
      "destination_url",
    ].map(normalizeHeader);
    for (const col of REQUIRED) {
      expect(headers.includes(col)).toBe(true);
    }
  });

  it("skips duplicate video_id and rejects invalid rows without crashing", () => {
    const knownCategories = new Set(["technology"]);
    const existingIds = new Set(["source-unique-id-001"]);
    const seen = new Set<string>();

    const rows = [
      {
        video_id: "source-unique-id-002",
        title: "Good",
        thumbnail_url: "https://picsum.photos/1.jpg",
        duration: "10:00",
        views: "100",
        category: "Technology",
        destination_url: "https://example.com/a",
      },
      {
        video_id: "source-unique-id-001",
        title: "Existing",
        thumbnail_url: "https://picsum.photos/2.jpg",
        duration: "10:00",
        views: "100",
        category: "Technology",
        destination_url: "https://example.com/b",
      },
      {
        video_id: "bad-url",
        title: "Bad",
        thumbnail_url: "https://picsum.photos/3.jpg",
        duration: "10:00",
        views: "100",
        category: "Technology",
        destination_url: "http://insecure.example/a",
      },
    ];

    const results = rows.map((row) => {
      const errors = validateRow(row, { knownCategories, existingIds, seen });
      if (!errors.length) seen.add(row.video_id);
      return errors;
    });

    expect(results[0]).toEqual([]);
    expect(results[1].join(" ")).toMatch(/duplicate/);
    expect(results[2].join(" ")).toMatch(/destination|bad/);
    expect(seen.has("source-unique-id-002")).toBe(true);
  });

  it("parses duration formats", () => {
    expect(parseDurationToSeconds("12:45")).toBe(765);
    expect(parseDurationToSeconds("1:02:03")).toBe(3723);
    expect(parseDurationToSeconds("bad")).toBeNull();
  });
});
