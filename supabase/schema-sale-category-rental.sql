-- ============================================================
-- 레거시: 렌탈 구분 CHECK 제약 (동적 구분 사용 시 불필요)
-- 신규 설치는 schema-admin-settings.sql + schema-sale-category-dynamic.sql 사용
-- ============================================================

alter table sales drop constraint if exists sales_sale_category_check;
alter table quotes drop constraint if exists quotes_sale_category_check;

insert into sale_category_options (name, sort_order)
values ('렌탈', 5)
on conflict (name) do nothing;
