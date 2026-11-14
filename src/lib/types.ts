export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_featured: boolean;
  video_count?: number;
  image_url?: string | null;
};

export type Video = {
  id: string;
  video_id: string;
  title: string;
  slug: string;
  thumbnail_url: string;
  duration_seconds: number;
  views: number;
  destination_url: string;
  category_id: string;
  created_at?: string;
  updated_at?: string;
  category?: Pick<Category, "name" | "slug"> | null;
};

export type ListingCard = {
  id: string;
  video_id: string;
  title: string;
  slug: string;
  thumbnailUrl: string;
  durationSeconds: number;
  views: number;
  category: { name: string; slug: string };
};

export type DurationFilter = "under5" | "5to10" | "10to20" | "20plus";
export type SortOption = "newest" | "oldest" | "views" | "shortest" | "trending";

export type CatalogueFilters = {
  q?: string;
  categorySlug?: string;
  duration?: DurationFilter;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
};
