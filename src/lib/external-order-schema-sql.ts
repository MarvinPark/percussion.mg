export const EXTERNAL_ORDER_SCHEMA_SQL = `-- 엑셀 등 외부 주문 → 매출 연동
alter table sales
  add column if not exists external_source text;

alter table sales
  add column if not exists external_order_id text;

create unique index if not exists sales_external_order_unique
  on sales (external_source, external_order_id)
  where external_order_id is not null;
`;
