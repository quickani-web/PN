import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VideoGrid } from "@/components/video/video-grid";
import { CategorySidebar } from "@/components/layout/sidebar";
import { ListingFilters } from "@/components/filters/listing-filters";
import { Pagination } from "@/components/filters/pagination";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { AdSlot } from "@/components/ads/ad-slot";
import {
  getCategories,
  getCategoryBySlug,
  queryCatalogue,
} from "@/lib/catalogue";
import { parseListingSearchParams } from "@/lib/parse-search-params";
import { absoluteUrl } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description:
      category.description ||
      `Browse ${category.name} video listings in the catalogue.`,
    alternates: { canonical: absoluteUrl(`/category/${category.slug}`) },
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = parseListingSearchParams(await searchParams);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const [categories, result] = await Promise.all([
    getCategories(),
    queryCatalogue({
      q: sp.q,
      categorySlug: category.slug,
      duration: sp.duration,
      sort: sp.sort,
      page: sp.page,
    }),
  ]);

  return (
    <div className="flex gap-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: category.name,
          description: category.description,
          url: absoluteUrl(`/category/${category.slug}`),
        }}
      />
      <CategorySidebar categories={categories} activeSlug={category.slug} />
      <div className="min-w-0 flex-1">
        <Breadcrumbs
          items={[
            { name: "Home", href: "/" },
            { name: "Categories", href: "/categories" },
            { name: category.name },
          ]}
        />
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-zinc-50">
          {category.name}
        </h1>
        {category.description && (
          <p className="mb-2 max-w-2xl text-sm text-zinc-400">
            {category.description}
          </p>
        )}
        <p className="mb-4 text-sm text-zinc-500">
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
          basePath={`/category/${category.slug}`}
          searchParams={{
            q: sp.q,
            duration: sp.duration,
            sort: sp.sort,
          }}
        />
      </div>
    </div>
  );
}
