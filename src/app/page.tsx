import Link from "next/link";
import type { Metadata } from "next";
import { Suspense } from "react";
import { VideoGrid } from "@/components/video/video-grid";
import { CategorySidebar } from "@/components/layout/sidebar";
import { ListingFilters } from "@/components/filters/listing-filters";
import { Pagination } from "@/components/filters/pagination";
import { AdSlot } from "@/components/ads/ad-slot";
import { LiveCamsPromo } from "@/components/ads/live-cams-promo";
import { CategoryCard } from "@/components/category/category-card";
import { JsonLd } from "@/components/seo/json-ld";
import { getCategories, getHomepageData, queryCatalogue } from "@/lib/catalogue";
import { parseListingSearchParams } from "@/lib/parse-search-params";
import { config } from "@/lib/config";
import { absoluteUrl } from "@/lib/utils";

export const metadata: Metadata = {
  title: `${config.appName} — Discover Video Links`,
  description:
    "One catalogue for every category. Search titles, filter by duration, and open authorized external destinations.",
  alternates: { canonical: absoluteUrl("/") },
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = parseListingSearchParams(await searchParams);
  const hasFilters = Boolean(sp.q || sp.category || sp.duration || sp.sort !== "newest" || sp.page > 1);

  if (hasFilters) {
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
          <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-zinc-50">
            Catalogue
          </h1>
          <p className="mb-4 text-sm text-zinc-400">
            {result.total.toLocaleString()} listings
          </p>
          <Suspense fallback={null}>
            <ListingFilters categories={categories} />
          </Suspense>
          <AdSlot className="mb-5" />
          <VideoGrid items={result.items} />
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            basePath="/"
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

  const home = await getHomepageData();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: config.appName,
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/search")}?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <div className="flex gap-8">
        <CategorySidebar categories={home.categories} />
        <div className="min-w-0 flex-1 space-y-10">
          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                  Latest listings
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Recently added links across every category
                </p>
              </div>
              <Link
                href="/search?sort=newest"
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                View all
              </Link>
            </div>
            <Suspense fallback={null}>
              <ListingFilters categories={home.categories} />
            </Suspense>
            <LiveCamsPromo className="mb-5" />
            <AdSlot className="mb-5" />
            <VideoGrid
              items={home.latest}
              emptyMessage="No listings yet. Seed categories and run the local import script."
            />
          </section>

          {home.trending.length > 0 && (
            <section>
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-zinc-50">
                    Trending on Vidora
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Most clicked destinations from this site
                  </p>
                </div>
                <Link
                  href="/search?sort=trending"
                  className="text-sm text-amber-400 hover:text-amber-300"
                >
                  View all
                </Link>
              </div>
              <VideoGrid items={home.trending} />
            </section>
          )}

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-zinc-50">
                  Most viewed
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Highest reported view counts
                </p>
              </div>
              <Link
                href="/search?sort=views"
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                View all
              </Link>
            </div>
            <VideoGrid items={home.popular} />
          </section>

          <section>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-xl font-semibold text-zinc-50">
              Categories
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {home.featuredCategories.map((cat) => (
                <CategoryCard key={cat.id} category={cat} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
