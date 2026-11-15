import Link from "next/link";
import { VideoCard } from "@/components/video/video-card";
import { LiveCamsPromo } from "@/components/ads/live-cams-promo";
import type { ListingCard } from "@/lib/types";

export function VideoGrid({
  items,
  emptyMessage = "Nothing here right now — try another category or check Live Cams.",
  showFallback = true,
}: {
  items: ListingCard[];
  emptyMessage?: string;
  /** When empty, still show Live Cams + browse links instead of a dead box */
  showFallback?: boolean;
}) {
  if (!items.length) {
    if (!showFallback) {
      return (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-12 text-center text-zinc-400">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-5 py-6 text-center">
          <p className="text-sm text-zinc-300">{emptyMessage}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              href="/"
              className="rounded bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700"
            >
              Home
            </Link>
            <Link
              href="/categories"
              className="rounded bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700"
            >
              Browse categories
            </Link>
            <Link
              href="/search?sort=views"
              className="rounded bg-zinc-800 px-3 py-1.5 text-zinc-200 hover:bg-zinc-700"
            >
              Most viewed
            </Link>
          </div>
        </div>
        <LiveCamsPromo />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => (
        <VideoCard key={item.id} listing={item} />
      ))}
    </div>
  );
}
