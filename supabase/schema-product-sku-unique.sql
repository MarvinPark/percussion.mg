-- ============================================================
-- 제품 중복 기준을 SKU 단일 키로 변경
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

drop index if exists products_unique_variant;

create unique index if not exists products_unique_sku
  on products (sku);
