-- ============================================================
-- 5단계: 견적서 (엑셀 양식 기반)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

-- 기존 간단 견적 테이블이 있으면 교체합니다.
drop table if exists quote_items cascade;
drop table if exists quotes cascade;

create table quotes (
  id uuid primary key default gen_random_uuid(),
  quote_date date not null default current_date,
  customer_name text not null,
  business_partner text,
  sale_category text not null default '소매' check (sale_category in ('도매', '소매', 'VIP', '중고')),
  customer_phone text,
  customer_address text,
  customer_email text,
  customer_note text,
  memo text,
  manager_name text,
  payment_method text,
  payment_method_id uuid references payment_methods(id) on delete set null,
  delivery_method text,
  delivery_date_note text,
  total_amount numeric(12, 0) not null default 0,
  card_amount numeric(12, 0) not null default 0,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_by_name text,
  created_at timestamptz not null default now()
);

create table quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  supplier text,
  purchase_source text,
  category text,
  brand text,
  product_name text not null,
  model_name text not null,
  quantity integer not null check (quantity > 0),
  consumer_price numeric(12, 0) not null default 0,
  sale_unit_price numeric(12, 0) not null default 0,
  rounded_unit_price numeric(12, 0) not null default 0,
  line_total numeric(12, 0) not null default 0,
  purchase_price numeric(12, 0) not null default 0,
  shipping_cost numeric(12, 0) not null default 0
);

create index quotes_created_at_idx on quotes (created_at desc);

alter table quotes enable row level security;
alter table quote_items enable row level security;

create policy "로그인 사용자 견적 조회"
  on quotes for select to authenticated using (true);

create policy "로그인 사용자 견적 등록"
  on quotes for insert to authenticated with check (true);

create policy "로그인 사용자 견적 삭제"
  on quotes for delete to authenticated using (true);

create policy "로그인 사용자 견적 수정"
  on quotes for update to authenticated using (true);

create policy "로그인 사용자 견적 항목 조회"
  on quote_items for select to authenticated using (true);

create policy "로그인 사용자 견적 항목 등록"
  on quote_items for insert to authenticated with check (true);
