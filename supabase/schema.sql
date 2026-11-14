-- Vidora video-link directory schema for Supabase PostgreSQL
-- Run in the Supabase SQL editor. Enables public read-only access via RLS.

create extension if not exists "pgcrypto";

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.videos (
  id uuid primary key default gen_random_uuid(),
  video_id text not null unique,
  title text not null,
  slug text not null unique,
  thumbnail_url text not null,
  duration_seconds integer not null check (duration_seconds >= 0),
  views bigint not null default 0 check (views >= 0),
  click_count bigint not null default 0 check (click_count >= 0),
  destination_url text not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One listing per destination (prevents cross-category homepage clones)
create unique index if not exists videos_destination_url_unique
  on public.videos (destination_url);

create index if not exists videos_category_created_idx
  on public.videos (category_id, created_at desc);

create index if not exists videos_views_idx
  on public.videos (views desc);

create index if not exists videos_click_count_idx
  on public.videos (click_count desc);

create index if not exists videos_duration_idx
  on public.videos (duration_seconds asc);

create index if not exists videos_created_idx
  on public.videos (created_at desc);

create index if not exists videos_title_trgm_idx
  on public.videos (title);

create index if not exists categories_sort_idx
  on public.categories (sort_order asc, name asc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

alter table public.categories enable row level security;
alter table public.videos enable row level security;

drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read videos" on public.videos;
create policy "Public read videos"
  on public.videos
  for select
  to anon, authenticated
  using (true);

-- Optional many-to-many (run migration_dedupe_categories.sql to enable fully)
create table if not exists public.video_categories (
  video_uuid uuid not null references public.videos (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (video_uuid, category_id)
);

create index if not exists video_categories_category_idx
  on public.video_categories (category_id);

alter table public.video_categories enable row level security;

drop policy if exists "Public read video_categories" on public.video_categories;
create policy "Public read video_categories"
  on public.video_categories
  for select
  to anon, authenticated
  using (true);

create or replace function public.increment_listing_clicks(p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.videos
  set click_count = click_count + 1
  where slug = p_slug;
end;
$$;

revoke all on function public.increment_listing_clicks(text) from public;
grant execute on function public.increment_listing_clicks(text)
  to anon, authenticated, service_role;

-- No public insert/update/delete policies.
-- Local import script uses the service-role key, which bypasses RLS.
