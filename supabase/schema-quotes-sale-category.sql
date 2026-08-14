-- 견적서 구분(도매/소매/VIP/중고) 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

alter table quotes
  add column if not exists sale_category text not null default '소매';

alter table quotes
  drop constraint if exists quotes_sale_category_check;

alter table quotes
  add constraint quotes_sale_category_check
  check (sale_category in ('도매', '소매', 'VIP', '중고', '렌탈'));
