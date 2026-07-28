-- 매출전환 롤백 등을 위해 sales delete policy 추가
-- Supabase SQL Editor → New query → 붙여넣기 → Run

create policy "로그인 사용자 판매 삭제"
  on sales for delete to authenticated using (true);
