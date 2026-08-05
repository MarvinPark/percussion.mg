-- ============================================================
-- 지마켓 주문 → 매출 연동
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (external_source / external_order_id는 schema-smartstore.sql과 공유)
-- ============================================================

insert into payment_methods (name, fee_rate, sort_order)
select 'G마켓', 11.0, 11
where not exists (
  select 1 from payment_methods where name = 'G마켓'
);
