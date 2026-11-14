-- Site click tracking for trending (run in Supabase SQL editor)

alter table public.videos
  add column if not exists click_count bigint not null default 0
  check (click_count >= 0);

create index if not exists videos_click_count_idx
  on public.videos (click_count desc);

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
