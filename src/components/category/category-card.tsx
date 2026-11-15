import Link from "next/link";
import { SafeThumbnail } from "@/components/media/safe-thumbnail";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${category.slug}`}
      className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/50 transition hover:border-amber-500/40 hover:bg-zinc-900"
    >
      <div className="relative aspect-video bg-zinc-950">
        <SafeThumbnail
          src={category.image_url}
          alt={category.name}
          className="transition duration-200 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="font-medium text-zinc-50">{category.name}</div>
          <div className="mt-0.5 text-xs text-zinc-300">
            {(category.video_count ?? 0).toLocaleString()} listings
          </div>
        </div>
      </div>
    </Link>
  );
}
