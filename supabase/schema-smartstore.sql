-- ============================================================
-- 스마트스토어 주문 → 매출 연동
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists external_source text;

alter table sales
  add column if not exists external_order_id text;

create unique index if not exists sales_external_order_unique
  on sales (external_source, external_order_id)
  where external_order_id is not null;

insert into payment_methods (name, fee_rate, sort_order)
select '네이버페이', 3.0, 10
where not exists (
  select 1 from payment_methods where name = '네이버페이'
);
