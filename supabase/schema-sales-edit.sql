-- ============================================================
-- 매출관리: 판매 기록 수정 권한
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema-sales.sql 실행 후, 수정 기능 사용 시 필요)
-- ============================================================

create policy "로그인 사용자 판매 수정"
  on sales for update to authenticated using (true);
