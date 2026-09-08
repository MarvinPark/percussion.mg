-- ============================================================
-- 세금계산서 발행 내역 RLS (수정·삭제)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

drop policy if exists "로그인 사용자 세금계산서 발행 수정" on tax_invoice_issues;
drop policy if exists "로그인 사용자 세금계산서 발행 삭제" on tax_invoice_issues;

create policy "로그인 사용자 세금계산서 발행 수정"
  on tax_invoice_issues for update to authenticated
  using (true)
  with check (true);

create policy "로그인 사용자 세금계산서 발행 삭제"
  on tax_invoice_issues for delete to authenticated
  using (true);
