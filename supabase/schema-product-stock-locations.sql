-- ============================================================
-- 제품: 주요재고, 재고위치, 예약 수량
-- Supabase SQL Editor에서 실행
-- ============================================================

alter table products
  add column if not exists is_key_stock boolean not null default false;

alter table products
  add column if not exists stock_location text not null default '양재';

alter table products
  add column if not exists stock_yangjae integer not null default 0;

alter table products
  add column if not exists stock_uiwang integer not null default 0;

alter table products
  add column if not exists reserved_quantity integer not null default 0;

-- 기존 재고를 양재로 이전 (stock_yangjae가 0이고 stock_quantity > 0인 경우)
update products
set
  stock_yangjae = stock_quantity,
  stock_location = coalesce(nullif(stock_location, ''), '양재')
where stock_yangjae = 0
  and stock_uiwang = 0
  and stock_quantity > 0;

-- 기존 위치명 정리
update products
set stock_location = '양재'
where stock_location in ('3층', 'B1', '전시', '');

update products
set stock_location = '의왕'
where stock_location = '의왕';
