-- 입고 기록일 (작성일과 별도로 지정 가능)
alter table stock_movements
  add column if not exists movement_date date;

create index if not exists stock_movements_movement_date_idx
  on stock_movements (movement_date desc nulls last);
