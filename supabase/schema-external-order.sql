-- ============================================================
-- 엑셀 등 외부 주문 → 매출 연동
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists external_source text;

alter table sales
  add column if not exists external_order_id text;

create unique index if not exists sales_external_order_unique
  on sales (external_source, external_order_id)
  where external_order_id is not null;
