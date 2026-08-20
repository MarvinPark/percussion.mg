-- 견적서 구분 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
--
-- 구분 선택 항목은 sale_category_options 테이블에서 관리합니다.
-- schema-admin-settings.sql 실행 후 schema-sale-category-dynamic.sql 도 실행하세요.

alter table quotes
  add column if not exists sale_category text not null default '소매';

alter table quotes
  drop constraint if exists quotes_sale_category_check;
