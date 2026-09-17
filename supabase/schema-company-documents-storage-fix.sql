-- ============================================================
-- 문서 Storage 버킷 MIME 제한 해제 (업로드 실패 수정)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-documents',
  'company-documents',
  false,
  15728640,
  null
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = null;
