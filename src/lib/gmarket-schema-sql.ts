export const GMARKET_SCHEMA_SQL = `-- 지마켓 주문 → 매출 연동 (스마트스토어와 external_* 컬럼 공유)
insert into payment_methods (name, fee_rate, sort_order)
select 'G마켓', 11.0, 11
where not exists (
  select 1 from payment_methods where name = 'G마켓'
);
`;
