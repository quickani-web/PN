import { VideoCard } from "@/components/video/video-card";
import type { ListingCard } from "@/lib/types";

export function VideoGrid({
  items,
  emptyMessage = "No listings found.",
}: {
  items: ListingCard[];
  emptyMessage?: string;
}) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 px-6 py-16 text-center text-zinc-400">
        {emptyMessage}
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
