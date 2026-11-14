import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CategoryCard } from "@/components/category/category-card";
import { getCategories } from "@/lib/catalogue";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse every category in the video-link catalogue.",
  alternates: { canonical: absoluteUrl("/categories") },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Categories" }]} />
      <h1 className="mb-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-zinc-50">
        Categories
      </h1>
      <p className="mb-6 text-sm text-zinc-400">
        Only categories with listings are shown.
      </p>
      {categories.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">No categories with listings yet.</p>
      )}
    </div>
  );
}
