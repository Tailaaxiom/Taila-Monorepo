-- 0007_media_storage.sql
--
-- The media table (0004) has existed since the donor portal pass, but
-- nothing could actually create a file behind it — file_path was just a
-- text column pointing at nothing. This adds real file storage.
--
-- Storage RLS is separate from table RLS: it lives on storage.objects, a
-- Supabase-managed table, and needs its own policies even though the
-- access rules mirror what's already on the media table. A private bucket
-- (not public) is used deliberately — a public bucket would make every
-- file readable by anyone with the URL, bypassing org scoping and the
-- donor_visible opt-in entirely. Files are read via short-lived signed
-- URLs instead, which only generate successfully if the requester passes
-- these policies at the moment they ask.
--
-- Path convention: every object's path starts with the org id
-- ({org_id}/{uuid}-{filename}) — storage.foldername(name)[1] extracts that
-- first segment, which is how org scoping is enforced here without a
-- foreign key (storage.objects has no org_id column of its own).

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- Staff (non-donor) of the org can upload and read anything under their
-- org's own path prefix.
create policy media_storage_insert_by_staff
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = app.org_id()
    and not app.is_donor()
  );

create policy media_storage_select_by_staff
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = app.org_id()
    and not app.is_donor()
  );

-- A donor can read an object only if a media row exists pointing at that
-- exact path, in their org, with donor_visible = true — the same opt-in
-- rule as media_read_by_donor (0004), enforced a second time at the
-- storage layer so a donor can't read a file just by knowing or guessing
-- its path.
create policy media_storage_select_by_donor
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'media'
    and app.is_donor()
    and exists (
      select 1 from public.media m
      where m.file_path = storage.objects.name
        and m.org_id = app.org_id()
        and m.donor_visible = true
    )
  );

-- No update/delete policy yet — removing or replacing an uploaded file is a
-- real gap, not implemented here. See docs/EXECUTION.md.