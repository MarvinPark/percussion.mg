-- ============================================================
-- 제품 키워드 태그
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table products
  add column if not exists keywords text;
