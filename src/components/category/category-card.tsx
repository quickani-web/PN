import Link from "next/link";
import { SafeThumbnail } from "@/components/media/safe-thumbnail";
import { formatCategoryName } from "@/lib/utils";
import type { Category } from "@/lib/types";

export function CategoryCard({ category }: { category: Category }) {
  const title = formatCategoryName(category.name);
  const count = category.video_count ?? 0;

  return (
    <Link
      href={`/category/${category.slug}`}
      className="group relative block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-amber-500/50"
    >
      <div className="relative aspect-[4/3] bg-zinc-950 sm:aspect-video">
        <SafeThumbnail
          src={category.image_url}
          alt=""
          className="scale-105 opacity-40 blur-[1px] transition duration-300 group-hover:scale-110 group-hover:opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/45" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <span className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-400/90">
            Category
          </span>
          <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold leading-tight tracking-tight text-zinc-50 drop-shadow-sm sm:text-2xl">
            {title}
          </h3>
          <p className="mt-2 text-xs text-zinc-300">
            {count.toLocaleString()} listings
          </p>
        </div>
      </div>
    </Link>
  );
}
