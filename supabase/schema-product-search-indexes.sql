-- 제품 검색 속도 개선 (선택 실행)
-- Supabase SQL Editor에서 schema-product-stats.sql 실행 후 이 파일도 실행하세요.

create extension if not exists pg_trgm;

create index if not exists products_supplier_trgm_idx
  on products using gin (supplier gin_trgm_ops);

create index if not exists products_category_trgm_idx
  on products using gin (category gin_trgm_ops);

create index if not exists products_brand_trgm_idx
  on products using gin (brand gin_trgm_ops);

create index if not exists products_product_name_trgm_idx
  on products using gin (product_name gin_trgm_ops);

create index if not exists products_model_name_trgm_idx
  on products using gin (model_name gin_trgm_ops);

create index if not exists products_sku_trgm_idx
  on products using gin (sku gin_trgm_ops);

create index if not exists products_keywords_trgm_idx
  on products using gin (keywords gin_trgm_ops);
