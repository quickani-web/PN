"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useNavigationPending } from "@/components/layout/navigation-pending";

const DURATIONS = [
  { value: "", label: "Any duration" },
  { value: "under5", label: "Under 5 min" },
  { value: "5to10", label: "5–10 min" },
  { value: "10to20", label: "10–20 min" },
  { value: "20plus", label: "20+ min" },
] as const;

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "views", label: "Most viewed" },
  { value: "oldest", label: "Oldest" },
  { value: "shortest", label: "Shortest duration" },
] as const;

export function ListingFilters({
  categories,
}: {
  categories: { name: string; slug: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { pending, startNavigation } = useNavigationPending();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      next.delete("page");
      const qs = next.toString();
      startNavigation(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [params, pathname, router, startNavigation],
  );

  const hasFilters =
    params.has("q") ||
    params.has("duration") ||
    params.has("sort") ||
    params.has("category");

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {!pathname.startsWith("/category/") && (
        <select
          aria-label="Category filter"
          disabled={pending}
          className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-200 disabled:opacity-60"
          value={params.get("category") || ""}
          onChange={(e) => update("category", e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      <select
        aria-label="Duration filter"
        disabled={pending}
        className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-200 disabled:opacity-60"
        value={params.get("duration") || ""}
        onChange={(e) => update("duration", e.target.value)}
      >
        {DURATIONS.map((d) => (
          <option key={d.value || "any"} value={d.value}>
            {d.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Sort order"
        disabled={pending}
        className="rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-200 disabled:opacity-60"
        value={params.get("sort") || "newest"}
        onChange={(e) => update("sort", e.target.value)}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startNavigation(() => {
              router.push(pathname);
            })
          }
          className="rounded-md px-2.5 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 disabled:opacity-60"
        >
          Clear filters
        </button>
      )}

      {pending && (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
          Updating…
        </span>
      )}
    </div>
  );
}
