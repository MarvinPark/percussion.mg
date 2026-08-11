-- ===== schema.sql =====
-- ============================================================
-- PERCUSSIONCENTER 관리시스템 - 제품 테이블
-- Supabase 대시보드 → SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  sku text not null,
  product_name text not null,
  model_name text not null,
  brand text,
  category text,
  supplier text not null,
  color text,
  product_option text,
  size text,
  purchase_price numeric(12, 0) not null default 0,
  sale_price numeric(12, 0) not null default 0,
  stock_quantity integer not null default 0,
  min_stock_quantity integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 같은 SKU + 공급처 + 옵션 조합은 중복 불가
create unique index if not exists products_unique_variant
  on products (
    sku,
    supplier,
    coalesce(color, ''),
    coalesce(product_option, ''),
    coalesce(size, '')
  );

alter table products enable row level security;

create policy "로그인 사용자 제품 조회"
  on products for select to authenticated using (true);

create policy "로그인 사용자 제품 등록"
  on products for insert to authenticated with check (true);

create policy "로그인 사용자 제품 수정"
  on products for update to authenticated using (true);

create policy "로그인 사용자 제품 삭제"
  on products for delete to authenticated using (true);

-- ===== schema-phase3.sql =====
-- ============================================================
-- 3단계: 입고/출고 + 재고 변동 이력
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (1~2단계 schema.sql을 이미 실행했다면 이 파일만 추가 실행)
-- ============================================================

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  movement_type text not null check (movement_type in ('in', 'out', 'adjust')),
  quantity integer not null check (quantity >= 0),
  stock_before integer not null,
  stock_after integer not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_product_id_idx
  on stock_movements (product_id);

create index if not exists stock_movements_created_at_idx
  on stock_movements (created_at desc);

alter table stock_movements enable row level security;

create policy "로그인 사용자 재고 이력 조회"
  on stock_movements for select to authenticated using (true);

create policy "로그인 사용자 재고 이력 등록"
  on stock_movements for insert to authenticated with check (true);

-- ===== schema-phase4.sql =====
-- ============================================================
-- 4단계: 사용자 프로필 + 변동 이력 수정자
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema.sql, schema-phase3.sql 실행 후 이 파일 실행)
-- ============================================================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "로그인 사용자 프로필 조회"
  on profiles for select to authenticated using (true);

create policy "본인 프로필 등록"
  on profiles for insert to authenticated with check (auth.uid() = id);

create policy "본인 프로필 수정"
  on profiles for update to authenticated using (auth.uid() = id);

alter table stock_movements
  add column if not exists modified_by_user_id uuid references auth.users(id) on delete set null;

alter table stock_movements
  add column if not exists modified_by_name text;

-- 기존 가입 사용자 프로필 (현재 1명: 전인철)
insert into profiles (id, full_name, phone)
select id, '전인철', '010-0000-0000'
from auth.users
on conflict (id) do update
set full_name = excluded.full_name,
    phone = excluded.phone,
    updated_at = now();

-- ===== schema-product-keywords.sql =====
-- ============================================================
-- 제품 키워드 태그
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table products
  add column if not exists keywords text;

-- ===== schema-product-stock-locations.sql =====
-- ============================================================
-- 제품: 주요재고, 재고위치, 예약 수량
-- Supabase SQL Editor에서 실행
-- ============================================================

alter table products
  add column if not exists is_key_stock boolean not null default false;

alter table products
  add column if not exists stock_location text not null default '3층';

alter table products
  add column if not exists stock_floor3 integer not null default 0;

alter table products
  add column if not exists stock_b1 integer not null default 0;

alter table products
  add column if not exists stock_display integer not null default 0;

alter table products
  add column if not exists reserved_quantity integer not null default 0;

-- 기존 재고를 3층으로 이전 (stock_floor3가 0이고 stock_quantity > 0인 경우)
update products
set
  stock_floor3 = stock_quantity,
  stock_location = coalesce(nullif(stock_location, ''), '3층')
where stock_floor3 = 0
  and stock_b1 = 0
  and stock_display = 0
  and stock_quantity > 0;

-- 기존 '전시' 위치명을 '의왕'으로 변경
update products
set stock_location = '의왕'
where stock_location = '전시';

-- ===== schema-sales.sql =====
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

-- ===== schema-sales-update.sql =====
-- ============================================================
-- 매출관리 추가: 고객 연락처 + 결제방식 수정 권한
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists business_partner text,
  add column if not exists customer_phone text,
  add column if not exists customer_address text;

create policy "로그인 사용자 결제방식 등록"
  on payment_methods for insert to authenticated with check (true);

create policy "로그인 사용자 결제방식 수정"
  on payment_methods for update to authenticated using (true);

create policy "로그인 사용자 결제방식 삭제"
  on payment_methods for delete to authenticated using (true);

create policy "로그인 사용자 판매 수정"
  on sales for update to authenticated using (true);

-- ===== schema-sales-category.sql =====
-- ============================================================
-- 매출관리: 판매 구분 (도매/소매/VIP/중고)
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- ============================================================

alter table sales
  add column if not exists sale_category text not null default '소매';

alter table sales
  drop constraint if exists sales_sale_category_check;

alter table sales
  add constraint sales_sale_category_check
  check (sale_category in ('도매', '소매', 'VIP', '중고'));

-- ===== schema-sales-edit.sql =====
-- ============================================================
-- 매출관리: 판매 기록 수정 권한
-- Supabase SQL Editor → New query → 붙여넣기 → Run
-- (schema-sales.sql 실행 후, 수정 기능 사용 시 필요)
-- ============================================================

create policy "로그인 사용자 판매 수정"
  on sales for update to authenticated using (true);

-- ===== schema-sales-fix.sql =====
-- 매출전환 롤백 등을 위해 sales delete policy 추가
-- Supabase SQL Editor → New query → 붙여넣기 → Run

create policy "로그인 사용자 판매 삭제"
  on sales for delete to authenticated using (true);

-- ===== schema-quotes.sql =====
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
  shipping_cost numeric(12, 0) not null default 0,
  color text,
  product_option text,
  size text
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

-- ===== schema-quotes-update.sql =====
-- 견적서 폼 업데이트 (기존 DB에 적용)
-- Supabase SQL Editor → New query → 붙여넣기 → Run

alter table quotes alter column customer_phone drop not null;

alter table quotes add column if not exists memo text;
alter table quotes add column if not exists manager_name text;
alter table quotes add column if not exists payment_method_id uuid references payment_methods(id) on delete set null;
alter table quotes add column if not exists business_partner text;

-- 이미 policy가 있으면 이 줄은 건너뛰세요.
-- create policy "로그인 사용자 견적 수정"
--   on quotes for update to authenticated using (true);


-- ===== schema-profile-job-title.sql =====
-- 프로필에 직함 추가
-- Supabase SQL Editor → Run

alter table profiles
  add column if not exists job_title text;


-- ===== schema-quotes-conversion.sql =====
alter table sales
  add column if not exists quote_id uuid references quotes(id) on delete set null;

create index if not exists sales_quote_id_idx on sales (quote_id);


-- ===== schema-phase7.sql + schema-phase7-admin-policy.sql =====
alter table profiles
  add column if not exists role text not null default 'employee'
  check (role in ('admin', 'manager', 'employee'));

update profiles
set role = 'admin', updated_at = now()
where id = (
  select id from auth.users order by created_at asc limit 1
)
and not exists (select 1 from profiles where role = 'admin');

create or replace function protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if TG_OP = 'INSERT' then
    if NEW.role is distinct from 'employee' then
      select role into caller_role from profiles where id = auth.uid();
      if caller_role is distinct from 'admin' then
        NEW.role := 'employee';
      end if;
    end if;
    return NEW;
  end if;

  if NEW.role is distinct from OLD.role then
    select role into caller_role from profiles where id = auth.uid();
    if caller_role is distinct from 'admin' then
      raise exception '역할 변경 권한이 없습니다.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists protect_profile_role_trigger on profiles;

create trigger protect_profile_role_trigger
  before insert or update on profiles
  for each row
  execute function protect_profile_role();

create or replace function public.update_user_role(
  target_user_id uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  admin_count integer;
begin
  select role into caller_role
  from public.profiles
  where id = auth.uid();

  if caller_role is distinct from 'admin' then
    raise exception '역할 변경 권한이 없습니다.';
  end if;

  if new_role not in ('admin', 'manager', 'employee') then
    raise exception '올바르지 않은 역할입니다.';
  end if;

  if target_user_id = auth.uid() and new_role is distinct from 'admin' then
    raise exception '본인의 관리자 권한은 스스로 해제할 수 없습니다.';
  end if;

  select count(*) into admin_count
  from public.profiles
  where role = 'admin';

  if admin_count = 1 then
    if exists (
      select 1
      from public.profiles
      where id = target_user_id
        and role = 'admin'
        and new_role is distinct from 'admin'
    ) then
      raise exception '마지막 관리자의 권한은 변경할 수 없습니다.';
    end if;
  end if;

  update public.profiles
  set role = new_role,
      updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception '사용자를 찾을 수 없습니다.';
  end if;
end;
$$;

revoke all on function public.update_user_role(uuid, text) from public;
grant execute on function public.update_user_role(uuid, text) to authenticated;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "관리자 프로필 수정" on profiles;

create policy "관리자 프로필 수정"
  on profiles for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- 스마트스토어 주문 → 매출 연동
-- (schema-smartstore.sql)
-- ============================================================

alter table sales
  add column if not exists external_source text;

alter table sales
  add column if not exists external_order_id text;

create unique index if not exists sales_external_order_unique
  on sales (external_source, external_order_id)
  where external_order_id is not null;

insert into payment_methods (name, fee_rate, sort_order)
select '네이버페이', 3.0, 10
where not exists (
  select 1 from payment_methods where name = '네이버페이'
);
