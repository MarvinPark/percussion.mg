-- ============================================================
-- 지마켓 API 연동 제거: 관련 매출·결제수단 삭제
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

delete from sales
where external_source = 'gmarket';

delete from payment_methods
where name = 'G마켓';
