-- Collector image storage: keep photos out of the JSON workspace payload.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'collector-images',
  'collector-images',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set public=excluded.public,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "collector images insert own folder" on storage.objects;
create policy "collector images insert own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id='collector-images'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
);

drop policy if exists "collector images update own folder" on storage.objects;
create policy "collector images update own folder"
on storage.objects
for update
to authenticated
using (
  bucket_id='collector-images'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
)
with check (
  bucket_id='collector-images'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
);

drop policy if exists "collector images delete own folder" on storage.objects;
create policy "collector images delete own folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id='collector-images'
  and (storage.foldername(name))[1]=(select auth.uid()::text)
);
