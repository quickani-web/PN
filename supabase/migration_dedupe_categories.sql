-- Many-to-many categories so one video can belong to multiple categories
-- without duplicating homepage listings.

create table if not exists public.video_categories (
  video_uuid uuid not null references public.videos (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  primary key (video_uuid, category_id)
);

create index if not exists video_categories_category_idx
  on public.video_categories (category_id);

create index if not exists video_categories_video_idx
  on public.video_categories (video_uuid);

alter table public.video_categories enable row level security;

drop policy if exists "Public read video_categories" on public.video_categories;
create policy "Public read video_categories"
  on public.video_categories
  for select
  to anon, authenticated
  using (true);

-- Seed junction from current single category_id values
insert into public.video_categories (video_uuid, category_id)
select id, category_id
from public.videos
on conflict do nothing;

-- Prefer unique destination URLs going forward
create unique index if not exists videos_destination_url_unique
  on public.videos (destination_url);
