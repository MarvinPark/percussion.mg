-- ============================================================
-- 4단계: 매출관리 (판매 기록 + 결제 수수료 + 마진)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema.sql, schema-phase3.sql 실행 후 실행)
-- ============================================================

create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee_rate numeric(5, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into payment_methods (name, fee_rate, sort_order) values
  ('현금', 0, 1),
  ('계좌이체', 0, 2),
  ('카드', 3.0, 3),
  ('할부/카드', 3.5, 4)
on conflict (name) do nothing;

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sold_at date not null default current_date,
  product_id uuid not null references products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_sale_price numeric(12, 0) not null,
  unit_purchase_price numeric(12, 0) not null default 0,
  customer_name text,
  business_partner text,
  payment_method text not null,
  sale_category text not null default '소매' check (sale_category in ('도매', '소매', 'VIP', '중고')),
  payment_fee_rate numeric(5, 2) not null default 0,
  payment_fee_amount numeric(12, 0) not null default 0,
  total_amount numeric(12, 0) not null,
  margin_amount numeric(12, 0) not null,
  note text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx on sales (sold_at desc);
create index if not exists sales_product_id_idx on sales (product_id);

alter table payment_methods enable row level security;
alter table sales enable row level security;

create policy "로그인 사용자 결제방식 조회"
  on payment_methods for select to authenticated using (true);

create policy "로그인 사용자 판매 조회"
  on sales for select to authenticated using (true);

create policy "로그인 사용자 판매 등록"
  on sales for insert to authenticated with check (true);
