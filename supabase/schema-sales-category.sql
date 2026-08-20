-- ============================================================
-- 매출관리: 판매 구분 컬럼 추가
-- Supabase SQL Editor → New query → 붙여넣기 → Run
--
-- 구분 선택 항목은 sale_category_options 테이블에서 관리합니다.
-- schema-admin-settings.sql 실행 후 schema-sale-category-dynamic.sql 도 실행하세요.
-- ============================================================

alter table sales
  add column if not exists sale_category text not null default '소매';

alter table sales
  drop constraint if exists sales_sale_category_check;
