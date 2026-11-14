import Link from "next/link";
import type { Category } from "@/lib/types";

export function CategorySidebar({
  categories,
  activeSlug,
}: {
  categories: Category[];
  activeSlug?: string;
}) {
  return (
    <aside className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-20 space-y-1">
        <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Categories
        </h2>
        <Link
          href="/"
          className={`block rounded-md px-2.5 py-1.5 text-sm transition ${
            !activeSlug
              ? "bg-zinc-800 text-amber-300"
              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
          }`}
        >
          All listings
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className={`flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition ${
              activeSlug === c.slug
                ? "bg-zinc-800 text-amber-300"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <span className="truncate">{c.name}</span>
            <span className="ml-2 text-[11px] tabular-nums text-zinc-500">
              {c.video_count ?? 0}
            </span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
