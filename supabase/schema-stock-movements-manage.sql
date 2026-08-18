-- 입고 목록 수정/삭제 권한
create policy "로그인 사용자 재고 이력 수정"
  on stock_movements for update to authenticated
  using (true)
  with check (true);

create policy "로그인 사용자 재고 이력 삭제"
  on stock_movements for delete to authenticated
  using (true);
