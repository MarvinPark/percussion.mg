-- ============================================================
-- 동적 판매 구분 활성화 (관리자에서 추가한 구분 저장 허용)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
--
-- 선행: supabase/schema-admin-settings.sql (sale_category_options 테이블)
-- ============================================================

alter table quotes drop constraint if exists quotes_sale_category_check;
alter table sales drop constraint if exists sales_sale_category_check;
