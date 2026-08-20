-- ============================================================
-- 매출관리 추가: 고객 연락처 + 결제방식 수정 권한
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists business_partner text,
  add column if not exists customer_phone text,
  add column if not exists customer_address text;

create policy "로그인 사용자 결제방식 등록"
  on payment_methods for insert to authenticated with check (true);

create policy "로그인 사용자 결제방식 수정"
  on payment_methods for update to authenticated using (true);

create policy "로그인 사용자 결제방식 삭제"
  on payment_methods for delete to authenticated using (true);

drop policy if exists "로그인 사용자 판매 수정" on sales;

create policy "로그인 사용자 판매 수정"
  on sales for update to authenticated
  using (true)
  with check (true);
