-- ============================================================
-- 문서 탭 접근 권한 — 기존 DB용
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

insert into role_permission_grants (role, permission) values
  ('admin', 'viewDocuments'),
  ('admin', 'manageDocuments'),
  ('manager', 'viewDocuments'),
  ('manager', 'manageDocuments'),
  ('employee', 'viewDocuments')
on conflict (role, permission) do nothing;
