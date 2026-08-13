-- quote_items 수정/삭제 RLS (견적 수정 시 항목 교체에 필요)
-- Supabase SQL Editor → New query → 붙여넣기 → Run

create policy "로그인 사용자 견적 항목 수정"
  on quote_items for update to authenticated using (true);

create policy "로그인 사용자 견적 항목 삭제"
  on quote_items for delete to authenticated using (true);
