import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoGrid } from "@/components/video/video-grid";
import { CategorySidebar } from "@/components/layout/sidebar";
import { ListingFilters } from "@/components/filters/listing-filters";
import { Pagination } from "@/components/filters/pagination";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AdSlot } from "@/components/ads/ad-slot";
import { getCategories, queryCatalogue } from "@/lib/catalogue";
import { parseListingSearchParams } from "@/lib/parse-search-params";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Search",
  description: "Search video listings by title and refine with filters.",
  robots: { index: false, follow: true },
  alternates: { canonical: absoluteUrl("/search") },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = parseListingSearchParams(await searchParams);
  const [categories, result] = await Promise.all([
    getCategories(),
    queryCatalogue({
      q: sp.q,
      categorySlug: sp.category,
      duration: sp.duration,
      sort: sp.sort,
      page: sp.page,
    }),
  ]);

  return (
    <div className="flex gap-8">
      <CategorySidebar categories={categories} activeSlug={sp.category} />
      <div className="min-w-0 flex-1">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: sp.q ? `Search: ${sp.q}` : "Search" },
          ]}
        />
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-zinc-50">
          {sp.q ? `Results for “${sp.q}”` : "Browse listings"}
        </h1>
        <p className="mb-4 text-sm text-zinc-400">
          {result.total.toLocaleString()} matches
        </p>
        <Suspense fallback={null}>
          <ListingFilters categories={categories} />
        </Suspense>
        <AdSlot className="mb-5" />
        <VideoGrid
          items={result.items}
          emptyMessage="No listings matched your search and filters."
        />
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          basePath="/search"
          searchParams={{
            q: sp.q,
            category: sp.category,
            duration: sp.duration,
            sort: sp.sort,
          }}
        />
      </div>
    </div>
  );
}
