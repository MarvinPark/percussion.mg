-- ============================================================
-- 매출관리: 판매 구분 (도매/소매/VIP/중고)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists sale_category text not null default '소매';

alter table sales
  drop constraint if exists sales_sale_category_check;

alter table sales
  add constraint sales_sale_category_check
  check (sale_category in ('도매', '소매', 'VIP', '중고'));
