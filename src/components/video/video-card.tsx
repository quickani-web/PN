import Image from "next/image";
import { formatDuration, formatViews } from "@/lib/utils";
import type { ListingCard } from "@/lib/types";

export function VideoCard({ listing }: { listing: ListingCard }) {
  return (
    <article className="group">
      <a
        href={`/api/redirect/${listing.slug}`}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="block focus-visible:outline-none"
      >
        <div className="relative aspect-video overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 transition group-hover:ring-amber-500/60 group-focus-visible:ring-2 group-focus-visible:ring-amber-400">
          <Image
            src={listing.thumbnailUrl}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition duration-200 group-hover:scale-[1.03]"
            loading="lazy"
            unoptimized
          />
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
            {formatDuration(listing.durationSeconds)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug text-zinc-100 group-hover:text-amber-300">
          {listing.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
          <span>{formatViews(listing.views)} views</span>
          <span className="text-zinc-600">•</span>
          <span className="truncate">{listing.category.name}</span>
        </div>
      </a>
    </article>
  );
}
