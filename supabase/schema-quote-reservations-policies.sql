-- quote_reservations RLS 정책 (재실행 가능)
-- ERROR 42710: policy already exists 발생 시 이 파일을 사용하세요.

alter table quote_reservations enable row level security;

drop policy if exists "로그인 사용자 견적 예약 조회" on quote_reservations;
drop policy if exists "로그인 사용자 견적 예약 등록" on quote_reservations;
drop policy if exists "로그인 사용자 견적 예약 수정" on quote_reservations;
drop policy if exists "로그인 사용자 견적 예약 삭제" on quote_reservations;

create policy "로그인 사용자 견적 예약 조회"
  on quote_reservations for select to authenticated using (true);

create policy "로그인 사용자 견적 예약 등록"
  on quote_reservations for insert to authenticated with check (true);

create policy "로그인 사용자 견적 예약 수정"
  on quote_reservations for update to authenticated using (true);

create policy "로그인 사용자 견적 예약 삭제"
  on quote_reservations for delete to authenticated using (true);
