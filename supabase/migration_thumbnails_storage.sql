-- Public thumbnail bucket. Create via dashboard or cache-thumbnails script if missing.
-- Objects are written only with the service role; anon can read.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'thumbnails',
  'thumbnails',
  true,
  2097152,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read thumbnails" on storage.objects;
create policy "Public read thumbnails"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'thumbnails');

-- No public write policies — imports use service_role only.
