-- ============================================================
-- 제품 중복 기준을 SKU 단일 키로 변경
-- Supabase SQL Editor → New query → 붙여넣기 → Run
--
-- 주의: 중복 SKU가 남아 있으면 아래 create 는 실패합니다.
-- 적용 여부까지 확인하려면 schema-product-sku-unique-enforce.sql 를
-- 실행하세요.
-- ============================================================

drop index if exists products_unique_variant;

create unique index if not exists products_unique_sku
  on products (sku);
