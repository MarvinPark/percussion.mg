-- 판매/견적 구분에 '렌탈' 추가
-- Supabase SQL Editor에서 실행

alter table sales
  drop constraint if exists sales_sale_category_check;

alter table sales
  add constraint sales_sale_category_check
  check (sale_category in ('도매', '소매', 'VIP', '중고', '렌탈'));

alter table quotes
  drop constraint if exists quotes_sale_category_check;

alter table quotes
  add constraint quotes_sale_category_check
  check (sale_category in ('도매', '소매', 'VIP', '중고', '렌탈'));
