-- 3층 + B1 → 양재 통합, 의왕 유지
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table products add column if not exists stock_yangjae integer not null default 0;
alter table products add column if not exists stock_uiwang integer not null default 0;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'stock_floor3'
  ) then
    update products
    set
      stock_yangjae = coalesce(stock_floor3, 0) + coalesce(stock_b1, 0),
      stock_uiwang = coalesce(stock_display, 0);
  end if;
end $$;

update products
set stock_location = '양재'
where stock_location in ('3층', 'B1', '');

update products
set stock_location = '의왕'
where stock_location = '전시';

alter table products alter column stock_location set default '양재';

alter table products drop column if exists stock_floor3;
alter table products drop column if exists stock_b1;
alter table products drop column if exists stock_display;

alter table quote_reservations add column if not exists stock_yangjae integer not null default 0 check (stock_yangjae >= 0);
alter table quote_reservations add column if not exists stock_uiwang integer not null default 0 check (stock_uiwang >= 0);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'quote_reservations' and column_name = 'stock_floor3'
  ) then
    update quote_reservations
    set
      stock_yangjae = coalesce(stock_floor3, 0) + coalesce(stock_b1, 0),
      stock_uiwang = coalesce(stock_display, 0);
  end if;
end $$;

alter table quote_reservations drop column if exists stock_floor3;
alter table quote_reservations drop column if exists stock_b1;
alter table quote_reservations drop column if exists stock_display;
