-- ============================================================
-- 사용자 계정 사용 정지 (account_status = suspended)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema-admin-settings.sql 실행 후)
-- ============================================================

alter table profiles
  drop constraint if exists profiles_account_status_check;

alter table profiles
  add constraint profiles_account_status_check
  check (account_status in ('pending_setup', 'pending_approval', 'active', 'suspended'));
