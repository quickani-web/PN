import type { DurationFilter, SortOption } from "@/lib/types";

export function parseListingSearchParams(
  input: Record<string, string | string[] | undefined>,
) {
  const get = (key: string) => {
    const v = input[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const durationRaw = get("duration");
  const sortRaw = get("sort");
  const pageRaw = get("page");

  const duration = (
    ["under5", "5to10", "10to20", "20plus"] as DurationFilter[]
  ).includes(durationRaw as DurationFilter)
    ? (durationRaw as DurationFilter)
    : undefined;

  const sort = (
    ["newest", "oldest", "views", "shortest", "trending"] as SortOption[]
  ).includes(sortRaw as SortOption)
    ? (sortRaw as SortOption)
    : "newest";

  return {
    q: get("q")?.trim() || undefined,
    category: get("category")?.trim() || undefined,
    duration,
    sort,
    page: Math.max(1, Number(pageRaw) || 1),
  };
}
