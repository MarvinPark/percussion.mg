-- 견적 예약 시 위치별 차감 내역 (3층 → B1 → 의왕)
-- schema-quote-reservations.sql 실행 후 이 파일을 실행하세요.

alter table quote_reservations
  add column if not exists stock_floor3 integer not null default 0 check (stock_floor3 >= 0),
  add column if not exists stock_b1 integer not null default 0 check (stock_b1 >= 0),
  add column if not exists stock_display integer not null default 0 check (stock_display >= 0);
