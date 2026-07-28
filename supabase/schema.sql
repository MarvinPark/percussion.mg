-- ============================================================
-- PERCUSSIONCENTER 관리시스템 - 제품 테이블
-- Supabase 대시보드 → SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text not null,
  model_name text not null,
  brand text,
  category text,
  supplier text not null,
  color text,
  product_option text,
  size text,
  purchase_price numeric(12, 0) not null default 0,
  sale_price numeric(12, 0) not null default 0,
  stock_quantity integer not null default 0,
  min_stock_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 같은 SKU + 공급처 + 옵션 조합은 중복 불가
create unique index if not exists products_unique_variant
  on products (
    sku,
    supplier,
    coalesce(color, ''),
    coalesce(product_option, ''),
    coalesce(size, '')
  );

alter table products enable row level security;

create policy "로그인 사용자 제품 조회"
  on products for select to authenticated using (true);

create policy "로그인 사용자 제품 등록"
  on products for insert to authenticated with check (true);

create policy "로그인 사용자 제품 수정"
  on products for update to authenticated using (true);

create policy "로그인 사용자 제품 삭제"
  on products for delete to authenticated using (true);
