-- 견적 예약 시 위치별 차감 내역 (양재 → 의왕)
-- schema-quote-reservations.sql 실행 후 이 파일을 실행하세요.

alter table quote_reservations
  add column if not exists stock_yangjae integer not null default 0 check (stock_yangjae >= 0),
  add column if not exists stock_uiwang integer not null default 0 check (stock_uiwang >= 0);
