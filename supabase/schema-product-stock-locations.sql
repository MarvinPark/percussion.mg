-- ============================================================
-- 제품: 주요재고, 재고위치, 예약 수량
-- Supabase SQL Editor에서 실행
-- ============================================================

alter table products
  add column if not exists is_key_stock boolean not null default false;

alter table products
  add column if not exists stock_location text not null default '3층';

alter table products
  add column if not exists stock_floor3 integer not null default 0;

alter table products
  add column if not exists stock_b1 integer not null default 0;

alter table products
  add column if not exists stock_display integer not null default 0;

alter table products
  add column if not exists reserved_quantity integer not null default 0;

-- 기존 재고를 3층으로 이전 (stock_floor3가 0이고 stock_quantity > 0인 경우)
update products
set
  stock_floor3 = stock_quantity,
  stock_location = coalesce(nullif(stock_location, ''), '3층')
where stock_floor3 = 0
  and stock_b1 = 0
  and stock_display = 0
  and stock_quantity > 0;

-- 기존 '전시' 위치명을 '의왕'으로 변경
update products
set stock_location = '의왕'
where stock_location = '전시';
